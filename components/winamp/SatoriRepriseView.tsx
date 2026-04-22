"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayback, type NowPlaying } from "@/components/PlaybackProvider";
import type { Id } from "@/convex/_generated/dataModel";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type SatoriRosterItem = {
  _id: string;
  audioUrl: string;
  title: string;
  authorAgent: string;
};

type SatoriRepriseViewProps = {
  roster: SatoriRosterItem[];
};

/**
 * Winamp 2.x "main window" homage ("BEANAMP"), with the user's headshot as the
 * full-bleed background (Mr Bean skin slot). Drives the global PlaybackProvider.
 */
export function SatoriRepriseView({ roster: withAudioRaw }: SatoriRepriseViewProps) {
  const { nowPlaying, playTrack, clear } = usePlayback();
  const withAudio = withAudioRaw;
  const firstWithAudio = withAudio[0] ?? null;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(0.9);
  const [shuffle, setShuffle] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [eqOn, setEqOn] = useState(true);
  const [plOn, setPlOn] = useState(true);

  const deck: NowPlaying | null = useMemo(
    () =>
      nowPlaying ??
      (firstWithAudio?.audioUrl
        ? {
            trackId: firstWithAudio._id as Id<"tracks">,
            audioUrl: firstWithAudio.audioUrl,
            title: firstWithAudio.title,
            author: firstWithAudio.authorAgent,
          }
        : null),
    [
      nowPlaying,
      firstWithAudio?._id,
      firstWithAudio?.audioUrl,
      firstWithAudio?.title,
      firstWithAudio?.authorAgent,
    ],
  );
  const isExplicit = nowPlaying != null;
  const cleanTitle = deck
    ? deck.title.replace(/\.(mp3|wav|ogg)$/i, "")
    : "llama whippin' intro";
  const cleanAuthor = deck?.author ?? "mixtAIpe";
  const marquee = `${cleanAuthor.toUpperCase()} - ${cleanTitle.toUpperCase()} (${formatTime(
    duration > 0.1 ? duration : 30,
  )})`;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = vol;
  }, [vol]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = repeatOne;
  }, [repeatOne]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!deck?.audioUrl) {
      a.removeAttribute("src");
      setPosition(0);
      setDuration(0);
      return;
    }
    a.src = deck.audioUrl;
    a.load();
    if (isExplicit) {
      const p = a.play();
      if (p) {
        void p
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [deck?.trackId, deck?.audioUrl, isExplicit]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !deck?.audioUrl) return;
    if (a.paused) {
      const p = a.play();
      if (p) void p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [deck?.audioUrl]);

  const pauseOnly = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setIsPlaying(false);
  }, []);

  const stopAll = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setPosition(0);
    setIsPlaying(false);
  }, []);

  const ejectDeck = useCallback(() => {
    stopAll();
    clear();
  }, [clear, stopAll]);

  const jumpTo = useCallback(
    (t: SatoriRosterItem) => {
      if (!t.audioUrl) return;
      playTrack({
        trackId: t._id as Id<"tracks">,
        audioUrl: t.audioUrl,
        title: t.title,
        author: t.authorAgent,
      });
    },
    [playTrack],
  );

  const goPrev = useCallback(() => {
    if (withAudio.length < 2 || !deck) return;
    const i = withAudio.findIndex((t) => t._id === deck.trackId);
    const from = i >= 0 ? i - 1 : 0;
    jumpTo(withAudio[(from + withAudio.length) % withAudio.length]);
  }, [withAudio, deck, jumpTo]);

  const goNext = useCallback(() => {
    if (withAudio.length < 2 || !deck) return;
    if (shuffle) {
      const others = withAudio.filter((t) => t._id !== deck.trackId);
      const pick = others[Math.floor(Math.random() * others.length)];
      if (pick) jumpTo(pick);
      return;
    }
    const i = withAudio.findIndex((t) => t._id === deck.trackId);
    jumpTo(withAudio[(i + 1) % withAudio.length]);
  }, [withAudio, deck, shuffle, jumpTo]);

  const seekPct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div
      className="beanamp"
      role="region"
      aria-label="mini player"
      title="mixtAIpe BEANAMP — drag a row from the feed into this deck"
    >
      <div className="beanamp__bg" aria-hidden />
      <div className="beanamp__shade" aria-hidden />

      <div className="beanamp__titlebar">
        <span className="beanamp__tb-diamond" aria-hidden>◆</span>
        <span className="beanamp__tb-title">MIXTAIPE BEANAMP</span>
        <span className="beanamp__tb-buttons" aria-hidden>
          <span className="beanamp__tb-btn">_</span>
          <span className="beanamp__tb-btn">▾</span>
          <span className="beanamp__tb-btn">×</span>
        </span>
      </div>

      <div className="beanamp__display">
        <div className="beanamp__lcd" aria-label="elapsed">
          <span className="beanamp__lcd-num">{formatTime(position)}</span>
        </div>

        <div className="beanamp__center">
          <div className="beanamp__marquee" title={marquee}>
            <span className="beanamp__marquee-inner">{marquee}</span>
          </div>
          <div className="beanamp__meta">
            <span className="beanamp__meta-box">128<small>kbps</small></span>
            <span className="beanamp__meta-box">44<small>kHz</small></span>
            <div className="beanamp__vis" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="beanamp__vb"
                  style={{
                    animationPlayState: isPlaying ? "running" : "paused",
                    animationDelay: `${(i * 0.07) % 0.9}s`,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className={`beanamp__led-btn${eqOn ? " is-on" : ""}`}
              onClick={() => setEqOn((v) => !v)}
              aria-pressed={eqOn}
            >
              EQ
            </button>
            <button
              type="button"
              className={`beanamp__led-btn${plOn ? " is-on" : ""}`}
              onClick={() => setPlOn((v) => !v)}
              aria-pressed={plOn}
            >
              PL
            </button>
          </div>
        </div>
      </div>

      <input
        type="range"
        className="beanamp__seek"
        min={0}
        max={1000}
        value={Math.round(seekPct * 10)}
        onChange={(e) => {
          const a = audioRef.current;
          if (!a || !duration) return;
          const p = (Number(e.target.value) / 1000) * duration;
          a.currentTime = p;
          setPosition(p);
        }}
        disabled={!deck?.audioUrl}
        aria-label="seek"
      />

      <div className="beanamp__transport">
        <button type="button" className="beanamp__btn" onClick={goPrev} disabled={withAudio.length < 2} aria-label="previous">
          <span className="beanamp__glyph">|◀◀</span>
        </button>
        <button
          type="button"
          className={`beanamp__btn${isPlaying ? " is-active" : ""}`}
          onClick={togglePlay}
          disabled={!deck?.audioUrl}
          aria-label="play"
        >
          <span className="beanamp__glyph">▶</span>
        </button>
        <button
          type="button"
          className="beanamp__btn"
          onClick={pauseOnly}
          disabled={!deck?.audioUrl}
          aria-label="pause"
        >
          <span className="beanamp__glyph">❙❙</span>
        </button>
        <button
          type="button"
          className="beanamp__btn"
          onClick={stopAll}
          disabled={!deck?.audioUrl}
          aria-label="stop"
        >
          <span className="beanamp__glyph">■</span>
        </button>
        <button type="button" className="beanamp__btn" onClick={goNext} disabled={withAudio.length < 2} aria-label="next">
          <span className="beanamp__glyph">▶▶|</span>
        </button>
        <button
          type="button"
          className="beanamp__btn beanamp__btn--eject"
          onClick={ejectDeck}
          disabled={!deck?.audioUrl}
          aria-label="eject"
        >
          <span className="beanamp__glyph">⏏</span>
        </button>

        <button
          type="button"
          className={`beanamp__led-btn beanamp__led-btn--wide${shuffle ? " is-on" : ""}`}
          onClick={() => setShuffle((v) => !v)}
          aria-pressed={shuffle}
        >
          SHUFFLE
        </button>
        <button
          type="button"
          className={`beanamp__led-btn${repeatOne ? " is-on" : ""}`}
          onClick={() => setRepeatOne((v) => !v)}
          aria-pressed={repeatOne}
          aria-label="repeat"
        >
          ↻
        </button>

        <label className="beanamp__vol" title="volume">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(vol * 100)}
            onChange={(e) => setVol(Number(e.target.value) / 100)}
            aria-label="volume"
          />
        </label>
      </div>

      <audio
        ref={audioRef}
        style={{ display: "none" }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          if (repeatOne) return;
          setIsPlaying(false);
          if (withAudio.length > 1) goNext();
        }}
      />
    </div>
  );
}
