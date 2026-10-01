import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Music, 
  Play, 
  Pause, 
  Check, 
  X, 
  Volume2, 
  Clock, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Scissors,
  Radio
} from 'lucide-react';
import { YoutubeTrack } from '../types';
import { 
  searchYouTubeTracks, 
  fetchYouTubeSuggestions, 
  convertToYoutubeTrack, 
  YouTubeSearchResult
} from '../services/youtubeSearch';

interface Props {
  selectedTrack?: YoutubeTrack;
  onSelectTrack: (track?: YoutubeTrack) => void;
  startTimeSeconds: number;
  onStartTimeChange: (seconds: number) => void;
  durationSeconds?: number;
  onDurationChange?: (seconds: number) => void;
}

// 48 simulated acoustic waveform heights representing dynamic music beats
const WAVEFORM_BARS = [
  25, 38, 55, 75, 45, 35, 65, 88, 95, 70, 48, 62, 85, 100, 78, 52, 
  68, 85, 96, 74, 45, 58, 82, 98, 90, 65, 48, 70, 92, 100, 80, 60, 
  45, 68, 86, 94, 75, 55, 40, 62, 84, 95, 70, 50, 65, 48, 32, 20
];

const DURATION_OPTIONS = [
  { value: 15, label: '15s', badge: 'Story' },
  { value: 30, label: '30s', badge: 'Feed' },
  { value: 45, label: '45s', badge: 'Estendido' },
  { value: 60, label: '60s', badge: 'Curtas' },
];

export const YouTubeMusicPicker: React.FC<Props> = ({
  selectedTrack,
  onSelectTrack,
  startTimeSeconds,
  onStartTimeChange,
  durationSeconds = 30,
  onDurationChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  
  // Live snippet preview playback state
  const [isPreviewingSnippet, setIsPreviewingSnippet] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const maxTrackSeconds = 240; // 4 minutes timeline range
  const currentDuration = durationSeconds || 30;
  const endSeconds = Math.min(maxTrackSeconds, startTimeSeconds + currentDuration);

  // Initial load with default popular tracks
  useEffect(() => {
    loadDefaultTracks();
  }, []);

  // When track changes or is deselected, stop snippet preview
  useEffect(() => {
    setIsPreviewingSnippet(false);
  }, [selectedTrack?.youtube_id]);

  const loadDefaultTracks = async () => {
    setIsSearching(true);
    setPreviewingId(null);
    try {
      const data = await searchYouTubeTracks('músicas mais tocadas brasil');
      setResults(data);
    } catch {
      // fallback handled inside service
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (termToSearch?: string) => {
    const query = termToSearch !== undefined ? termToSearch : searchTerm;
    if (!query.trim()) {
      loadDefaultTracks();
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);
    setPreviewingId(null);

    try {
      const data = await searchYouTubeTracks(query);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Autocomplete suggestions debounce
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const suggs = await fetchYouTubeSuggestions(searchTerm);
      setSuggestions(suggs);
      if (suggs.length > 0) setShowSuggestions(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectTrack = (item: YouTubeSearchResult) => {
    const track = convertToYoutubeTrack(item, startTimeSeconds, currentDuration);
    onSelectTrack(track);
    setPreviewingId(null);
    setIsPreviewingSnippet(false);
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    let ytId = manualUrl.trim();
    if (manualUrl.includes('v=')) {
      ytId = manualUrl.split('v=')[1].split('&')[0];
    } else if (manualUrl.includes('youtu.be/')) {
      ytId = manualUrl.split('youtu.be/')[1].split('?')[0];
    }

    const track: YoutubeTrack = {
      id: `manual-yt-${Date.now()}`,
      title: 'Música Selecionada',
      artist: 'Faixa de áudio',
      youtube_url: manualUrl.trim(),
      youtube_id: ytId,
      start_time_seconds: startTimeSeconds,
      duration_seconds: currentDuration
    };

    onSelectTrack(track);
    setManualUrl('');
    setShowManualUrl(false);
  };

  const togglePreviewSearchResult = (item: YouTubeSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();

    if (previewingId === item.id) {
      setPreviewingId(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      setIsPreviewingSnippet(false);
      setPreviewingId(item.id);
      if (item.preview_audio_url) {
        if (!audioRef.current) {
          audioRef.current = new Audio(item.preview_audio_url);
        } else {
          audioRef.current.src = item.preview_audio_url;
        }
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateStartTime = (newSec: number) => {
    const clamped = Math.max(0, Math.min(maxTrackSeconds - currentDuration, newSec));
    onStartTimeChange(clamped);
    if (selectedTrack) {
      onSelectTrack({
        ...selectedTrack,
        start_time_seconds: clamped,
        duration_seconds: currentDuration
      });
    }
    if (isPreviewingSnippet) {
      setPreviewKey((k) => k + 1);
    }
  };

  const updateDuration = (newDur: number) => {
    if (onDurationChange) {
      onDurationChange(newDur);
    }
    if (startTimeSeconds + newDur > maxTrackSeconds) {
      onStartTimeChange(Math.max(0, maxTrackSeconds - newDur));
    }
    if (selectedTrack) {
      onSelectTrack({
        ...selectedTrack,
        start_time_seconds: Math.min(startTimeSeconds, maxTrackSeconds - newDur),
        duration_seconds: newDur
      });
    }
    if (isPreviewingSnippet) {
      setPreviewKey((k) => k + 1);
    }
  };

  const toggleSnippetPreview = () => {
    if (previewingId) {
      setPreviewingId(null);
      if (audioRef.current) audioRef.current.pause();
    }
    setIsPreviewingSnippet(!isPreviewingSnippet);
    setPreviewKey((k) => k + 1);
  };

  const startPercent = Math.max(0, Math.min(100, (startTimeSeconds / maxTrackSeconds) * 100));
  const snippetWidthPercent = Math.max(5, Math.min(100 - startPercent, (currentDuration / maxTrackSeconds) * 100));

  return (
    <div className="space-y-4 bg-neutral-50 dark:bg-neutral-850/80 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-750 shadow-sm">
      {/* Header with Title and Clear Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              Adicionar Música
            </h4>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              Escolha uma trilha sonora para sua publicação
            </p>
          </div>
        </div>

        {selectedTrack && (
          <button
            type="button"
            onClick={() => {
              onSelectTrack(undefined);
              setIsPreviewingSnippet(false);
            }}
            className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <X className="w-3 h-3" /> Remover
          </button>
        )}
      </div>

      {/* Selected Track Banner & Interactive Snippet Trimmer */}
      {selectedTrack && (
        <div className="space-y-3.5 p-3.5 bg-gradient-to-b from-red-500/10 via-rose-500/5 to-purple-500/10 dark:from-red-950/40 dark:via-rose-950/20 dark:to-purple-950/30 rounded-2xl border border-red-200/90 dark:border-red-900/50 shadow-sm animate-in fade-in duration-150">
          
          {/* Track Summary Header */}
          <div className="flex items-center gap-3">
            <div className="relative w-13 h-13 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-700">
              {selectedTrack.cover_url ? (
                <img
                  src={selectedTrack.cover_url}
                  alt={selectedTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-rose-500 text-white">
                  <Music className="w-5 h-5" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Music className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/70 px-2 py-0.5 rounded-full">
                  Música Selecionada
                </span>
                <span className="text-[10px] text-neutral-400 font-medium">
                  Áudio da Publicação
                </span>
              </div>
              <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                {selectedTrack.title}
              </h5>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate font-medium">
                {selectedTrack.artist}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectTrack(undefined);
                setIsPreviewingSnippet(false);
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-white/80 dark:hover:bg-neutral-800 transition-colors"
              title="Trocar música"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* SECTION: ESCOLHER PARTE DA MÚSICA (SNIPPET SELECTOR) */}
          <div className="p-3 bg-white/90 dark:bg-neutral-900/90 rounded-xl border border-red-200/70 dark:border-red-900/40 space-y-3">
            
            {/* Title & Current Snippet Range */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white">
                <Scissors className="w-4 h-4 text-red-500 rotate-90" />
                <span>Escolher parte da música</span>
              </div>
              <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/60 font-mono text-xs font-bold">
                <Clock className="w-3 h-3 text-red-500" />
                <span>{formatSeconds(startTimeSeconds)}</span>
                <span className="text-neutral-400">até</span>
                <span>{formatSeconds(endSeconds)}</span>
                <span className="ml-1 text-[10px] text-neutral-500 dark:text-neutral-400 font-sans">
                  ({currentDuration}s)
                </span>
              </div>
            </div>

            {/* Interactive Audio Waveform & Scrubber */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 px-0.5">
                <span>0:00</span>
                <span className="text-red-600 dark:text-red-400 font-bold">
                  Arraste ou clique para mover o trecho
                </span>
                <span>4:00</span>
              </div>

              {/* Waveform Canvas Container */}
              <div 
                className="relative h-14 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1.5 flex items-end justify-between gap-[2px] overflow-hidden cursor-pointer select-none group border border-neutral-200/80 dark:border-neutral-700/80"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  const clickedSecond = Math.round(ratio * maxTrackSeconds);
                  updateStartTime(clickedSecond);
                }}
              >
                {/* Visual Highlight Overlay for Selected Snippet Window */}
                <div 
                  className="absolute top-0 bottom-0 bg-red-500/20 dark:bg-red-500/25 border-x-2 border-red-500 rounded pointer-events-none transition-all duration-75 shadow-sm"
                  style={{
                    left: `${startPercent}%`,
                    width: `${snippetWidthPercent}%`,
                  }}
                >
                  <div className="absolute top-1 left-1 bg-red-600 text-white font-mono text-[8px] font-bold px-1 rounded shadow">
                    {formatSeconds(startTimeSeconds)}
                  </div>
                  <div className="absolute bottom-1 right-1 bg-neutral-900 text-white font-mono text-[8px] font-bold px-1 rounded shadow">
                    {formatSeconds(endSeconds)}
                  </div>
                </div>

                {/* 48 Acoustic Soundwave Bars */}
                {WAVEFORM_BARS.map((heightPercent, idx) => {
                  const barTime = (idx / WAVEFORM_BARS.length) * maxTrackSeconds;
                  const isInsideSegment = barTime >= startTimeSeconds && barTime <= endSeconds;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col justify-end items-center h-full z-10"
                    >
                      <div
                        className={`w-full rounded-full transition-all duration-150 ${
                          isInsideSegment
                            ? isPreviewingSnippet
                              ? 'bg-gradient-to-t from-red-600 via-rose-500 to-amber-400 shadow-sm animate-pulse'
                              : 'bg-gradient-to-t from-red-600 to-rose-500 shadow-sm'
                            : 'bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Range Slider Scrubber */}
              <input
                type="range"
                min={0}
                max={maxTrackSeconds - currentDuration}
                step={1}
                value={startTimeSeconds}
                onChange={(e) => updateStartTime(Number(e.target.value))}
                className="w-full accent-red-600 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Duration Selector Tabs (15s, 30s, 45s, 60s) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-500" /> Duração do trecho:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATION_OPTIONS.map((opt) => {
                  const isActive = currentDuration === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateDuration(opt.value)}
                      className={`py-1.5 px-1 rounded-lg text-center transition-all border ${
                        isActive
                          ? 'bg-red-600 text-white border-red-600 font-bold shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[8px] opacity-80 truncate">{opt.badge}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-Tuning Nudge Buttons & Minute/Second manual input */}
            <div className="pt-2 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateStartTime(startTimeSeconds - 10)}
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-md text-[10px] font-bold"
                  title="Voltar 10 segundos"
                >
                  -10s
                </button>
                <button
                  type="button"
                  onClick={() => updateStartTime(startTimeSeconds - 5)}
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-md text-[10px] font-bold"
                  title="Voltar 5 segundos"
                >
                  -5s
                </button>
                <button
                  type="button"
                  onClick={() => updateStartTime(startTimeSeconds - 1)}
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-md text-[10px] font-bold"
                  title="Voltar 1 segundo"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => updateStartTime(startTimeSeconds + 1)}
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-md text-[10px] font-bold"
                  title="Avançar 1 segundo"
                >
                  +1s
                </button>
                <button
                  type="button"
                  onClick={() => updateStartTime(startTimeSeconds + 5)}
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-md text-[10px] font-bold"
                  title="Avançar 5 segundos"
                >
                  +5s
                </button>
                <button
                  type="button"
                  onClick={() => updateStartTime(startTimeSeconds + 10)}
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-md text-[10px] font-bold"
                  title="Avançar 10 segundos"
                >
                  +10s
                </button>
              </div>

              {/* Exact Minute : Second Manual Box */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                <span className="text-[10px] font-semibold text-neutral-400">Início:</span>
                <div className="flex items-center gap-1 font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={Math.floor(startTimeSeconds / 60)}
                    onChange={(e) => {
                      const mins = Math.max(0, Math.min(3, Number(e.target.value) || 0));
                      const secs = startTimeSeconds % 60;
                      updateStartTime(mins * 60 + secs);
                    }}
                    className="w-5 text-center bg-transparent outline-none text-red-600 dark:text-red-400"
                  />
                  <span>:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={startTimeSeconds % 60}
                    onChange={(e) => {
                      const secs = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                      const mins = Math.floor(startTimeSeconds / 60);
                      updateStartTime(mins * 60 + secs);
                    }}
                    className="w-6 text-center bg-transparent outline-none text-red-600 dark:text-red-400"
                  />
                </div>
              </div>
            </div>

            {/* PREVIEW BUTTON: OUVI O TRECHO ESCOLHIDO */}
            <div className="pt-2">
              <button
                type="button"
                onClick={toggleSnippetPreview}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                  isPreviewingSnippet
                    ? 'bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-900'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white'
                }`}
              >
                {isPreviewingSnippet ? (
                  <>
                    <Pause className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>Pausar teste do trecho ({formatSeconds(startTimeSeconds)} - {formatSeconds(endSeconds)})</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Ouvir trecho selecionado ({formatSeconds(startTimeSeconds)} até {formatSeconds(endSeconds)})</span>
                  </>
                )}
              </button>

              {/* Pure Audio Card when Previewing the Snippet (NO VIDEO VISIBLE) */}
              {isPreviewingSnippet && (
                <div className="mt-2.5 p-3 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 rounded-xl border border-rose-500/30 shadow-xl space-y-2 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selectedTrack.cover_url ? (
                        <img
                          src={selectedTrack.cover_url}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center shrink-0 text-white">
                          <Music className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                            <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                            Tocando áudio do trecho
                          </span>
                          <span className="inline-flex items-end gap-0.5 h-3 shrink-0">
                            <span className="w-0.5 h-1.5 bg-rose-400 animate-pulse"></span>
                            <span className="w-0.5 h-3 bg-rose-400 animate-pulse delay-75"></span>
                            <span className="w-0.5 h-2 bg-rose-400 animate-pulse delay-150"></span>
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-neutral-300">
                          {formatSeconds(startTimeSeconds)} até {formatSeconds(endSeconds)} ({currentDuration}s)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPreviewingSnippet(false)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] font-bold transition-colors"
                      title="Pausar prévia"
                    >
                      Pausar
                    </button>
                  </div>

                  {/* Hidden iframe for audio only - completely invisible, no video displayed */}
                  <iframe
                    key={previewKey}
                    src={`https://www.youtube-nocookie.com/embed/${selectedTrack.youtube_id}?enablejsapi=1&autoplay=1&mute=0&start=${startTimeSeconds}&end=${endSeconds}&loop=1&playlist=${selectedTrack.youtube_id}&controls=0&playsinline=1`}
                    title="Prévia do trecho selecionado"
                    className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                    allow="autoplay; encrypted-media"
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Live Music Search Box */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Buscar música, banda ou cantor..."
            className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setShowSuggestions(false);
                loadDefaultTracks();
              }}
              className="absolute right-12 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="absolute right-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buscar'}
          </button>
        </div>

        {/* Suggestions Popover */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {suggestions.map((sugg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSearchTerm(sugg);
                  handleSearch(sugg);
                }}
                className="w-full px-3 py-2 text-left text-xs text-neutral-800 dark:text-neutral-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2"
              >
                <Search className="w-3 h-3 text-neutral-400" />
                <span className="truncate">{sugg}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 px-0.5">
          <span>
            {searchTerm ? `Resultados para "${searchTerm}":` : 'Músicas em destaque:'}
          </span>
          <span className="text-[10px] font-medium text-neutral-400">
            {results.length} faixas
          </span>
        </div>

        {isSearching ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Buscando músicas...
            </p>
            <p className="text-[10px] text-neutral-400">
              Localizando as faixas disponíveis
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-8 text-center text-neutral-400 space-y-2">
            <Music className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600" />
            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              Nenhuma música encontrada
            </p>
            <p className="text-[11px]">Digite outro nome de cantor, banda ou música.</p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800">
            {results.map((item) => {
              const isSelected = selectedTrack?.youtube_id === item.id;
              const isPreviewing = previewingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectTrack(item)}
                  className={`group pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-sm'
                      : 'hover:bg-white dark:hover:bg-neutral-800/90'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Thumbnail with duration */}
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 shadow-sm">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white">
                          <Music className="w-4 h-4" />
                        </div>
                      )}
                      {item.duration && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] font-mono text-white px-1 rounded">
                          {item.duration}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate group-hover:text-rose-600 transition-colors">
                        {item.title}
                      </h5>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1">
                        <Music className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />
                        <span className="truncate">{item.artist}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions: Preview & Select */}
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {/* In-app preview player toggle */}
                    <button
                      type="button"
                      onClick={(e) => togglePreviewSearchResult(item, e)}
                      title="Ouvir prévia no app"
                      className={`p-1.5 rounded-lg border transition-all ${
                        isPreviewing
                          ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                          : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-rose-500'
                      }`}
                    >
                      {isPreviewing ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Select indicator/button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTrack(item);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Escolhida
                        </>
                      ) : (
                        'Escolher'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* In-app Pure Audio Preview (NO VIDEO VISIBLE) */}
        {previewingId && !results.find((r) => r.id === previewingId)?.preview_audio_url && (
          <div className="mt-2 p-2.5 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 rounded-xl border border-rose-500/30 shadow-md animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-white text-[11px] px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-rose-400 text-xs">Ouvindo Prévia de Áudio</span>
                    <span className="inline-flex items-end gap-0.5 h-2.5 shrink-0">
                      <span className="w-0.5 h-1.5 bg-rose-400 animate-pulse"></span>
                      <span className="w-0.5 h-2.5 bg-rose-400 animate-pulse delay-75"></span>
                      <span className="w-0.5 h-2 bg-rose-400 animate-pulse delay-150"></span>
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {results.find((r) => r.id === previewingId)?.title || 'Música'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingId(null)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-bold transition-colors ml-2 shrink-0"
              >
                Parar
              </button>
            </div>

            {/* Hidden iframe for audio only - completely invisible, no video displayed */}
            <iframe
              key={previewingId}
              src={`https://www.youtube-nocookie.com/embed/${previewingId}?enablejsapi=1&autoplay=1&mute=0&controls=0&playsinline=1`}
              title="Prévia da música"
              className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
              allow="autoplay; encrypted-media"
            />
          </div>
        )}
      </div>

      {/* Optional fallback direct audio/video URL accordion (non-intrusive) */}
      <div className="pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
        <button
          type="button"
          onClick={() => setShowManualUrl(!showManualUrl)}
          className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex items-center justify-between w-full py-1"
        >
          <span>Prefere adicionar por link direto? (Opcional)</span>
          {showManualUrl ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showManualUrl && (
          <form onSubmit={handleManualUrlSubmit} className="mt-2 flex items-center gap-2">
            <input
              type="url"
              placeholder="Cole o link da música ou vídeo..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[11px] text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
            />
            <button
              type="submit"
              disabled={!manualUrl.trim()}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 text-white dark:bg-neutral-700 text-xs font-semibold hover:bg-neutral-900 disabled:opacity-50"
            >
              Aplicar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
