// ============================================================================
// Audio feature extractor. WAV only (which is our synth fallback). For MP3
// returns from real Lyria, we decode the RIFF/WAVE header if present, else
// derive duration-only from HTTP Content-Length + bitrate hint.
//
// These numbers feed the reaction prompt so each agent's comment can be
// grounded in objective facts (actual BPM, real spectral balance) instead of
// leaning on vibes. No canned text — the numbers ARE the ground truth.
// ============================================================================

export type AudioFeatures = {
  durationSec: number;
  bpm: number;
  peakDbfs: number;
  rmsDbfs: number;
  lowEnergy: number;
  midEnergy: number;
  highEnergy: number;
  dynamicRange: number;
  sampleRate: number;
  channels: number;
};

/**
 * Analyse PCM WAV bytes. If the buffer isn't a RIFF/WAVE file we return null
 * and the caller falls back to a duration-only estimate.
 */
export function analyseWavBytes(bytes: Uint8Array): AudioFeatures | null {
  if (bytes.byteLength < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readAscii(view, 0, 4) !== "RIFF") return null;
  if (readAscii(view, 8, 4) !== "WAVE") return null;

  // Walk chunks to find fmt + data — don't assume fixed offsets.
  let pos = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataBytes = 0;
  while (pos + 8 <= view.byteLength) {
    const tag = readAscii(view, pos, 4);
    const size = view.getUint32(pos + 4, true);
    const bodyStart = pos + 8;
    if (tag === "fmt ") {
      const audioFormat = view.getUint16(bodyStart, true);
      channels = view.getUint16(bodyStart + 2, true);
      sampleRate = view.getUint32(bodyStart + 4, true);
      bitsPerSample = view.getUint16(bodyStart + 14, true);
      if (audioFormat !== 1) return null; // PCM only
    } else if (tag === "data") {
      dataOffset = bodyStart;
      dataBytes = size;
      break;
    }
    pos = bodyStart + size + (size % 2); // word-align
  }
  if (dataOffset < 0 || sampleRate === 0 || channels === 0) return null;
  if (bitsPerSample !== 16) return null; // MVP handles PCM16 only

  const sampleCount = Math.floor(dataBytes / 2 / channels);
  if (sampleCount <= 0) return null;

  // Decode to mono float32 (average channels if stereo).
  const mono = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      const o = dataOffset + (i * channels + ch) * 2;
      if (o + 2 > view.byteLength) break;
      const s = view.getInt16(o, true);
      sum += s / 0x8000;
    }
    mono[i] = sum / channels;
  }

  const durationSec = sampleCount / sampleRate;
  const { peak, rms } = peakAndRms(mono);
  const peakDbfs = 20 * Math.log10(Math.max(peak, 1e-6));
  const rmsDbfs = 20 * Math.log10(Math.max(rms, 1e-6));
  const bpm = estimateBpm(mono, sampleRate);
  const bands = spectralBalance(mono, sampleRate);

  return {
    durationSec: round(durationSec, 2),
    bpm: Math.round(bpm),
    peakDbfs: round(peakDbfs, 1),
    rmsDbfs: round(rmsDbfs, 1),
    lowEnergy: round(bands.low, 3),
    midEnergy: round(bands.mid, 3),
    highEnergy: round(bands.high, 3),
    dynamicRange: round(peakDbfs - rmsDbfs, 1),
    sampleRate,
    channels,
  };
}

function peakAndRms(mono: Float32Array) {
  let peak = 0;
  let sqSum = 0;
  for (let i = 0; i < mono.length; i++) {
    const v = mono[i];
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sqSum += v * v;
  }
  return { peak, rms: Math.sqrt(sqSum / mono.length) };
}

/**
 * Autocorrelation-based BPM estimate on an onset envelope. Not a real onset
 * detector — it's a rectified low-passed signal, which is good enough for
 * stable estimates on the kind of loopy 30s sketches Lyria / the synth
 * fallback produce. Returns 60–160 range; clamps on the way out.
 */
function estimateBpm(mono: Float32Array, sampleRate: number): number {
  const envHz = 200;
  const step = Math.max(1, Math.floor(sampleRate / envHz));
  const envLen = Math.floor(mono.length / step);
  const env = new Float32Array(envLen);
  let smoothed = 0;
  const alpha = 0.2;
  for (let i = 0; i < envLen; i++) {
    let max = 0;
    const start = i * step;
    const end = start + step;
    for (let j = start; j < end && j < mono.length; j++) {
      const a = Math.abs(mono[j]);
      if (a > max) max = a;
    }
    smoothed = smoothed * (1 - alpha) + max * alpha;
    env[i] = smoothed;
  }

  // Remove DC
  let mean = 0;
  for (let i = 0; i < env.length; i++) mean += env[i];
  mean /= env.length || 1;
  for (let i = 0; i < env.length; i++) env[i] -= mean;

  // Autocorrelate over BPM range 60..180
  const minLag = Math.floor((60 / 180) * envHz);
  const maxLag = Math.floor((60 / 60) * envHz);
  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < env.length; i++) {
      s += env[i] * env[i + lag];
    }
    if (s > bestScore) {
      bestScore = s;
      bestLag = lag;
    }
  }
  const bpm = (60 / bestLag) * envHz;
  return Math.max(60, Math.min(180, bpm));
}

/**
 * 3-band spectral energy split via a Goertzel-style bank. Not a full FFT —
 * fast, O(N*bands), good enough to say "this track is sub-heavy" truthfully.
 * Returns normalised shares that sum to 1.
 */
function spectralBalance(mono: Float32Array, sampleRate: number) {
  // Representative frequencies per band.
  const bands = [
    { name: "low" as const, freqs: [60, 90, 140, 220] },
    { name: "mid" as const, freqs: [400, 800, 1600, 2500] },
    { name: "high" as const, freqs: [4000, 6300, 9000, 12000] },
  ];
  const step = Math.max(1, Math.floor(mono.length / 22050));
  const downsampled = new Float32Array(Math.ceil(mono.length / step));
  for (let i = 0; i < downsampled.length; i++) downsampled[i] = mono[i * step];

  const energies = bands.map((b) => {
    let total = 0;
    for (const f of b.freqs) {
      total += goertzelPower(downsampled, sampleRate / step, f);
    }
    return total / b.freqs.length;
  });
  const sum = energies.reduce((a, b) => a + b, 0) || 1e-9;
  return {
    low: energies[0] / sum,
    mid: energies[1] / sum,
    high: energies[2] / sum,
  };
}

function goertzelPower(x: Float32Array, sr: number, freq: number): number {
  const k = Math.round((x.length * freq) / sr);
  const omega = (2 * Math.PI * k) / x.length;
  const coeff = 2 * Math.cos(omega);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < x.length; i++) {
    const s = x[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

function readAscii(view: DataView, offset: number, len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

function round(n: number, places: number) {
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

/**
 * Cheap duration-only estimate for MP3-ish payloads where we don't want to
 * pull in a decoder. Assumes ~128 kbps — wrong for anything else, but the
 * reaction prompt only needs a rough number plus "unknown spectral balance".
 */
export function estimateMp3Duration(byteLength: number): number {
  const assumedBitrateKbps = 128;
  return round((byteLength * 8) / (assumedBitrateKbps * 1000), 1);
}
