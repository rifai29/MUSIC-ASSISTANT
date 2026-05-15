export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  audioUrl: string; // Blob URL for local files or remote URL
  duration?: number;
  fileName: string;
}

export type PlaybackStatus = 'playing' | 'paused' | 'stopped';
export type RepeatMode = 'none' | 'one' | 'all';
