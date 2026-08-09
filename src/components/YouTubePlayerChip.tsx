import React, { useState } from 'react';
import { Music, Play, Pause, ExternalLink, Youtube } from 'lucide-react';
import { YoutubeTrack } from '../types';

interface Props {
  track?: YoutubeTrack;
  compact?: boolean;
}

export const YouTubePlayerChip: React.FC<Props> = ({ track, compact = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showIframe, setShowIframe] = useState(false);

  if (!track) return null;

  const embedUrl = `https://www.youtube.com/embed/${track.youtube_id}?autoplay=1&start=${track.start_time_seconds || 0}`;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
    setShowIframe(!isPlaying);
  };

  return (
    <div className="relative group z-10 my-1">
      <div
        onClick={togglePlay}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-md cursor-pointer hover:bg-black/80 transition-all ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white ${isPlaying ? 'animate-spin' : ''}`}>
          <Music className="w-3 h-3" />
        </div>

        <div className="flex flex-col max-w-[180px] sm:max-w-[240px] overflow-hidden">
          <span className="font-medium truncate leading-tight text-white/90">
            {track.title}
          </span>
          <span className="text-[10px] text-white/70 truncate flex items-center gap-1">
            <Youtube className="w-2.5 h-2.5 text-red-500" />
            {track.artist} {track.start_time_seconds ? `• ${Math.floor(track.start_time_seconds / 60)}:${(track.start_time_seconds % 60).toString().padStart(2, '0')}` : ''}
          </span>
        </div>

        <button
          type="button"
          className="ml-1 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 text-red-400" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>

      {showIframe && (
        <div className="mt-2 rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-black max-w-sm">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 text-white text-xs">
            <span className="flex items-center gap-1 font-medium text-red-400">
              <Youtube className="w-3.5 h-3.5" /> Tocando no YouTube
            </span>
            <a
              href={track.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white flex items-center gap-1"
            >
              Abrir <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <iframe
            src={embedUrl}
            title={track.title}
            className="w-full h-32 border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};
