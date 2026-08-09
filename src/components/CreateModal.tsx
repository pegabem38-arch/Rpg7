import React, { useState, useRef } from 'react';
import { X, Image, Film, Sparkles, Music, Youtube, MapPin, Check, Upload } from 'lucide-react';
import { YoutubeTrack } from '../types';
import { YOUTUBE_PRESET_TRACKS } from '../services/mockData';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel'>('post');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedYoutubeTrack, setSelectedYoutubeTrack] = useState<YoutubeTrack | undefined>(
    YOUTUBE_PRESET_TRACKS[0]
  );
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [startTimeSeconds, setStartTimeSeconds] = useState(30);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;

    let trackToAttach = selectedYoutubeTrack;

    // Handle custom YouTube input if typed
    if (customYoutubeUrl.trim()) {
      let ytId = customYoutubeUrl.trim();
      if (customYoutubeUrl.includes('v=')) {
        ytId = customYoutubeUrl.split('v=')[1].split('&')[0];
      } else if (customYoutubeUrl.includes('youtu.be/')) {
        ytId = customYoutubeUrl.split('youtu.be/')[1].split('?')[0];
      }

      trackToAttach = {
        id: `custom-yt-${Date.now()}`,
        title: 'Música do YouTube',
        artist: 'YouTube Audio',
        youtube_url: customYoutubeUrl.trim(),
        youtube_id: ytId,
        start_time_seconds: startTimeSeconds
      };
    } else if (trackToAttach) {
      trackToAttach = { ...trackToAttach, start_time_seconds: startTimeSeconds };
    }

    if (contentType === 'post') {
      store.createPost({
        media_url: mediaUrl,
        media_type: 'image',
        caption,
        location,
        youtube_track: trackToAttach
      });
    } else if (contentType === 'story') {
      store.createStory({
        media_url: mediaUrl,
        media_type: 'image',
        youtube_track: trackToAttach
      });
    } else if (contentType === 'reel') {
      store.createReel({
        video_url: mediaUrl,
        caption,
        youtube_track: trackToAttach
      });
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
          Criar Novo Conteúdo
        </h3>

        {/* Content Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setContentType('post');
              setMediaUrl('');
              setMediaFileName('');
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              contentType === 'post'
                ? 'bg-white dark:bg-neutral-900 text-rose-500 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Image className="w-4 h-4" /> Publicação
          </button>

          <button
            type="button"
            onClick={() => {
              setContentType('story');
              setMediaUrl('');
              setMediaFileName('');
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              contentType === 'story'
                ? 'bg-white dark:bg-neutral-900 text-rose-500 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Story
          </button>

          <button
            type="button"
            onClick={() => {
              setContentType('reel');
              setMediaUrl('');
              setMediaFileName('');
            }}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              contentType === 'reel'
                ? 'bg-white dark:bg-neutral-900 text-rose-500 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Film className="w-4 h-4" /> Reels
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Box (Phone Gallery / Camera) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
              {contentType === 'reel' ? 'Selecionar Vídeo do Celular' : 'Selecionar Foto/Vídeo do Celular'}
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept={contentType === 'reel' ? 'video/*' : 'image/*,video/*'}
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-500/50 hover:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 rounded-2xl p-5 text-center cursor-pointer transition-all hover:scale-[1.01]"
            >
              {mediaUrl ? (
                <div className="space-y-2">
                  {contentType === 'reel' || mediaUrl.startsWith('data:video') ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="max-h-48 w-auto mx-auto rounded-xl object-contain shadow-md"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Prévia"
                      className="max-h-48 w-auto mx-auto rounded-xl object-cover shadow-md"
                    />
                  )}
                  <p className="text-xs text-rose-500 font-bold truncate">
                    {mediaFileName || 'Arquivo selecionado'} (Clique para trocar)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-extrabold text-xs text-neutral-900 dark:text-white">
                    Clique aqui para escolher da Galeria do Celular
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {contentType === 'reel' ? 'Suporta vídeos MP4, MOV, WEBM' : 'Suporta imagens JPG, PNG, WEBM'}
                  </span>
                </div>
              )}
            </div>

            {/* Optional URL input fallback */}
            <div className="mt-3">
              <details className="text-[11px] text-neutral-400">
                <summary className="cursor-pointer hover:underline font-semibold">
                  Ou usar link de imagem/vídeo externo
                </summary>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-2 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs outline-none"
                />
              </details>
            </div>
          </div>

          {/* Caption (For Post & Reel) */}
          {contentType !== 'story' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Legenda / Descrição
              </label>
              <textarea
                rows={3}
                placeholder="Escreva uma legenda incrível..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          )}

          {/* Location (For Post) */}
          {contentType === 'post' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Localização (opcional)
              </label>
              <input
                type="text"
                placeholder="ex: São Paulo, SP"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          )}

          {/* YouTube Music Integration Section */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-500" /> Adicionar Música do YouTube
              </span>
              {selectedYoutubeTrack && (
                <button
                  type="button"
                  onClick={() => setSelectedYoutubeTrack(undefined)}
                  className="text-[10px] text-neutral-400 hover:text-rose-500"
                >
                  Remover
                </button>
              )}
            </div>

            {/* YouTube Track Presets */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto mb-3 pr-1">
              {YOUTUBE_PRESET_TRACKS.map((track) => {
                const isSelected = selectedYoutubeTrack?.id === track.id && !customYoutubeUrl;

                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      setSelectedYoutubeTrack(track);
                      setCustomYoutubeUrl('');
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-rose-500 text-white font-bold'
                        : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Music className="w-3.5 h-3.5 flex-shrink-0" />
                      <div className="truncate">
                        <span className="block truncate leading-tight">{track.title}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                          {track.artist}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom YouTube URL & Timestamp Start */}
            <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <input
                type="url"
                placeholder="Ou cole o link do YouTube (ex: https://youtube.com/watch?v=...)"
                value={customYoutubeUrl}
                onChange={(e) => {
                  setCustomYoutubeUrl(e.target.value);
                  if (e.target.value) setSelectedYoutubeTrack(undefined);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-[11px] focus:ring-1 focus:ring-red-500 outline-none"
              />

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400">Minuto de início (segundos):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={600}
                    value={startTimeSeconds}
                    onChange={(e) => setStartTimeSeconds(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-center text-xs text-neutral-900 dark:text-white font-bold"
                  />
                  <span className="text-[10px] text-neutral-400">s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!mediaUrl}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold text-xs shadow-md hover:opacity-95 disabled:opacity-40 transition-opacity"
            >
              Publicar Agora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
