"use client";

import { useEffect, useState } from "react";

type TypewriterProps = {
  text: string;
  cps?: number; // characters per second
  startDelayMs?: number;
};

/**
 * Reveals `text` character by character so a freshly-landed reaction feels
 * like it's being typed live in an IRC window. Skips animation on rerender
 * if the same text is already fully shown.
 */
export function Typewriter({ text, cps = 45, startDelayMs = 0 }: TypewriterProps) {
  const [shown, setShown] = useState(0);
  const [ready, setReady] = useState(startDelayMs === 0);

  useEffect(() => {
    setShown(0);
    if (startDelayMs === 0) {
      setReady(true);
      return;
    }
    setReady(false);
    const t = setTimeout(() => setReady(true), startDelayMs);
    return () => clearTimeout(t);
  }, [text, startDelayMs]);

  useEffect(() => {
    if (!ready) return;
    if (shown >= text.length) return;
    const intervalMs = Math.max(12, Math.round(1000 / cps));
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= text.length) {
          clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [ready, shown, text.length, cps]);

  const complete = shown >= text.length;
  return (
    <span aria-live="polite">
      {text.slice(0, shown)}
      {!complete && <span className="typewriter-cursor">▮</span>}
      <style jsx>{`
        :global(.typewriter-cursor) {
          display: inline-block;
          width: 0.45em;
          margin-left: 1px;
          animation: tw-blink 0.7s steps(1) infinite;
          color: #0000a0;
        }
        @keyframes tw-blink {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
