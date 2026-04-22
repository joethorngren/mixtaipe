type CdrSize = "small" | "large" | number;

const ALT_TITLES = ["Final", "Demo", "Draft", "v2", "Rough", "MIX", "Untitled", "Take 1"];

type CdrArtworkProps = {
  seed: string;
  title?: string;
  size?: CdrSize;
  /**
   * When provided, the disc renders as an interactive <button> (play control).
   * The caller drives visuals via `isPlaying` / `isLoaded`.
   */
  onPlayToggle?: () => void;
  /** Spin the disc (track is loaded AND the deck's audio is actively playing). */
  isPlaying?: boolean;
  /** The track is the one currently loaded in the deck (possibly paused). */
  isLoaded?: boolean;
  /** Greyed-out / non-interactive (e.g. demo rows or tracks still rendering). */
  disabled?: boolean;
  /** Tooltip shown instead of the default "Play {title}" hint. */
  hint?: string;
};

export function CdrArtwork({
  seed,
  title,
  size = 48,
  onPlayToggle,
  isPlaying = false,
  isLoaded = false,
  disabled = false,
  hint,
}: CdrArtworkProps) {
  const px = typeof size === "number" ? size : size === "large" ? 160 : 48;
  const h = hash(seed);
  const rot = (h % 40) - 20;
  const altRot = ((h >> 3) % 24) - 12;
  const inkColors = ["#1a1a1a", "#0000a0", "#a00000", "#006600", "#5a008a"];
  const ink = inkColors[h % inkColors.length];
  const altInk = inkColors[(h >> 5) % inkColors.length];
  const alt = ALT_TITLES[(h >> 7) % ALT_TITLES.length];

  const scrawl = pickScrawl(title, seed);

  const fontSize = px >= 120 ? 14 : px >= 80 ? 9 : 5;
  const altFontSize = px >= 120 ? 10 : px >= 80 ? 7 : 4;

  const svg = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      className={`cdr-artwork__svg${isPlaying ? " cdr-artwork__svg--spinning" : ""}`}
      style={{ flexShrink: 0, display: "block" }}
      aria-hidden={onPlayToggle ? true : undefined}
    >
      <defs>
        <radialGradient id={`g-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="40%" stopColor="#c0c0c0" />
          <stop offset="65%" stopColor="#a8a8a8" />
          <stop offset="82%" stopColor="#d0c090" />
          <stop offset="100%" stopColor="#707070" />
        </radialGradient>
        <radialGradient id={`sheen-${seed}`} cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill={`url(#g-${seed})`} stroke="#505050" />
      {[20, 17, 14, 11].map((r) => (
        <circle
          key={r}
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.3"
        />
      ))}
      <circle cx="24" cy="24" r="22" fill={`url(#sheen-${seed})`} />
      <circle cx="24" cy="24" r="8" fill="#1a1a1a" />
      <circle cx="24" cy="24" r="3" fill="#c8c8c8" stroke="#606060" strokeWidth="0.3" />
      <text
        x="24"
        y="15"
        textAnchor="middle"
        fontFamily="Permanent Marker, Marker Felt, Comic Sans MS, cursive"
        fontSize={fontSize}
        fill={ink}
        transform={`rotate(${rot} 24 24)`}
      >
        {scrawl}
      </text>
      <g transform={`rotate(${altRot} 24 36)`}>
        <text
          x="24"
          y="37"
          textAnchor="middle"
          fontFamily="Permanent Marker, Marker Felt, Comic Sans MS, cursive"
          fontSize={altFontSize}
          fill={altInk}
          textDecoration="line-through"
          style={{ textDecoration: "line-through" }}
        >
          {alt}
        </text>
        <line
          x1={24 - alt.length * (altFontSize * 0.28)}
          y1="35.5"
          x2={24 + alt.length * (altFontSize * 0.28)}
          y2="35.5"
          stroke={altInk}
          strokeWidth="0.6"
        />
      </g>
    </svg>
  );

  if (!onPlayToggle) {
    return <span className="cdr-artwork" style={{ width: px, height: px }}>{svg}</span>;
  }

  const label = hint
    ?? (disabled
      ? `${title ?? "demo track"} — demo row, not playable`
      : isLoaded
        ? `${isPlaying ? "Eject" : "Re-cue"} ${title ?? "track"} from the deck`
        : `Play ${title ?? "track"} in the deck`);

  const stateClass = [
    "cdr-artwork",
    "cdr-artwork--button",
    isLoaded ? "cdr-artwork--loaded" : undefined,
    isPlaying ? "cdr-artwork--playing" : undefined,
    disabled ? "cdr-artwork--disabled" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={stateClass}
      onClick={disabled ? undefined : onPlayToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isLoaded}
      title={label}
      style={{ width: px, height: px }}
    >
      {svg}
      <span className="cdr-artwork__overlay" aria-hidden>
        <span className="cdr-artwork__glyph">
          {disabled ? "–" : isPlaying ? "❙❙" : "▶"}
        </span>
      </span>
    </button>
  );
}

function pickScrawl(title: string | undefined, seed: string): string {
  if (!title) return "MIX";
  const cleaned = title.replace(/[_\-]+/g, " ").replace(/\.(mp3|wav|ogg)$/i, "").trim();
  if (!cleaned) return "MIX";
  const words = cleaned.split(/\s+/).filter(Boolean);
  const h = hash(seed);
  const pick = words.slice(0, Math.min(2, words.length)).join(" ");
  const upper = (h % 2 === 0 ? pick.toUpperCase() : pick).slice(0, 14);
  return upper || "MIX";
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
