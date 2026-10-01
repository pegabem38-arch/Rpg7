import React, { useState } from 'react';
import { Music, Play, Pause } from 'lucide-react';
import { YoutubeTrack } from '../types';

interface Props {
  track?: YoutubeTrack;
  compact?: boolean;
}

export const YouTubePlayerChip: React.FC<Props> = ({ track, compact = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!track) return null;

  const startSec = track.start_time_seconds || 0;
  const durationSec = track.duration_seconds || 30;
  const endSec = startSec + durationSec;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const embedUrl = `https://www.youtube-nocookie.com/embed/${track.youtube_id}?enablejsapi=1&autoplay=1&mute=0&start=${startSec}&end=${endSec}&loop=1&playlist=${track.youtube_id}&controls=0&playsinline=1`;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative group z-10 my-1">
      <div
        onClick={togglePlay}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/65 text-white border border-white/20 shadow-md cursor-pointer hover:bg-black/85 transition-all ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt=""
            className="w-5 h-5 rounded-full object-cover border border-white/40 flex-shrink-0"
          />
        ) : (
          <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex-shrink-0 ${isPlaying ? 'animate-bounce' : ''}`}>
            <Music className="w-3 h-3" />
          </div>
        )}

        <div className="flex flex-col max-w-[180px] sm:max-w-[240px] overflow-hidden">
          <span className="font-medium truncate leading-tight text-white/90">
            {track.title}
          </span>
          <span className="text-[10px] text-white/70 truncate flex items-center gap-1">
            <Music className="w-2.5 h-2.5 text-rose-400 flex-shrink-0" />
            <span className="truncate">{track.artist}</span>
            <span className="text-rose-400 font-mono font-medium flex-shrink-0">
              • {formatTime(startSec)} - {formatTime(endSec)} ({durationSec}s)
            </span>
          </span>
        </div>

        <button
          type="button"
          className="ml-1 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
          title={isPlaying ? 'Pausar áudio' : 'Ouvir áudio'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-rose-400" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Hidden audio iframe - No video visible! */}
      {isPlaying && (
        <iframe
          src={embedUrl}
          title={track.title}
          className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay; encrypted-media"
        />
      )}
    </div>
  );
};
