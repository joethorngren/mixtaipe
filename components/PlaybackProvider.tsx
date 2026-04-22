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
  /** Mirrors the deck's actual <audio> element state; the Beanamp pushes this. */
  isPlaying: boolean;
  /** Load this track into the global deck and start playback immediately. */
  playTrack: (t: NowPlaying) => void;
  /** Eject the deck (stops audio and unloads the track). */
  clear: () => void;
  /** Internal: called by the deck to report audio element play/pause state. */
  reportPlaying: (playing: boolean) => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTrack = useCallback((t: NowPlaying) => {
    setNowPlaying(t);
  }, []);

  const clear = useCallback(() => {
    setNowPlaying(null);
    setIsPlaying(false);
  }, []);

  const reportPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const value = useMemo(
    () => ({ nowPlaying, isPlaying, playTrack, clear, reportPlaying }),
    [nowPlaying, isPlaying, playTrack, clear, reportPlaying],
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
