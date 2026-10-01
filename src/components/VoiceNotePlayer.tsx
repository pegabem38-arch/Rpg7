import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface Props {
  audioUrl: string;
  duration?: number;
  isSelf?: boolean;
}

export const VoiceNotePlayer: React.FC<Props> = ({ audioUrl, duration = 0, isSelf = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Erro ao reproduzir áudio:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveDuration = totalDuration || 1;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  // Generate aesthetic static waveform bars based on audioUrl hash
  const waveformHeights = [
    30, 45, 75, 90, 60, 40, 70, 85, 95, 65, 45, 80, 100, 70, 50, 65, 85, 40, 55, 70
  ];

  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-2xl min-w-[210px] max-w-xs select-none ${
      isSelf 
        ? 'bg-black/15 text-white' 
        : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-800 dark:text-neutral-100'
    }`}>
      {/* Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 ${
          isSelf 
            ? 'bg-white text-rose-600 hover:bg-white/90' 
            : 'bg-rose-500 hover:bg-rose-600 text-white'
        }`}
        title={isPlaying ? 'Pausar' : 'Ouvir áudio'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform and progress */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div className="relative flex items-center gap-[2px] h-6 px-0.5">
          {waveformHeights.map((h, i) => {
            const barPercent = (i / waveformHeights.length) * 100;
            const isPlayed = barPercent <= progressPercent;

            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  isPlayed
                    ? isSelf ? 'bg-white' : 'bg-rose-500'
                    : isSelf ? 'bg-white/30' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              />
            );
          })}

          {/* Invisible interactive seek slider */}
          <input
            type="range"
            min={0}
            max={effectiveDuration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Timers & Microphone icon */}
        <div className="flex items-center justify-between text-[10px] font-mono leading-none opacity-80 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            <Volume2 className="w-2.5 h-2.5 opacity-60" />
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
