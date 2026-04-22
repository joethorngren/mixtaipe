"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Id } from "@/convex/_generated/dataModel";

export type NowPlaying = {
  trackId: Id<"tracks">;
  audioUrl: string;
  title: string;
  author: string;
};

type PlaybackContextValue = {
  nowPlaying: NowPlaying | null;
  /** Load this track into the global deck and start playback immediately. */
  playTrack: (t: NowPlaying) => void;
  clear: () => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  const playTrack = useCallback((t: NowPlaying) => {
    setNowPlaying(t);
  }, []);

  const clear = useCallback(() => {
    setNowPlaying(null);
  }, []);

  const value = useMemo(
    () => ({ nowPlaying, playTrack, clear }),
    [nowPlaying, playTrack, clear],
  );

  return (
    <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("usePlayback must be used within PlaybackProvider");
  }
  return ctx;
}
