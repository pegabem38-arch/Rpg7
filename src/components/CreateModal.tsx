import React, { useState, useRef } from 'react';
import { X, Image, Film, Sparkles, Music, Youtube, MapPin, Check, Upload, AtSign, Ban } from 'lucide-react';
import { YoutubeTrack, Profile } from '../types';
import { store } from '../services/store';
import { YouTubeMusicPicker } from './YouTubeMusicPicker';
import { MentionInputSuggestions } from './MentionInputSuggestions';
import { compressImage, convertToPermanentDataUrl } from '../utils/imageCompressor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const isBanned = store.isProfileBanned();
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel'>('post');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedYoutubeTrack, setSelectedYoutubeTrack] = useState<YoutubeTrack | undefined>(undefined);
  const [startTimeSeconds, setStartTimeSeconds] = useState(30);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const captionInputRef = useRef<HTMLTextAreaElement | null>(null);

  if (!isOpen) return null;

  if (isBanned) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 text-center border border-red-500/40 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto shadow-md">
            <Ban className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Conta Suspensa
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Esta conta foi banida pelo Administrador geral. Novas publicações, stories e curtas estão bloqueados.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Aplica exatamente a mesma lógica e conversão da foto de perfil:
  // Converte o arquivo bruto da câmera ou galeria do celular diretamente para Base64 Data URL permanente
  // via FileReader antes de salvar no estado e no banco de dados Supabase SQL.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFileName(file.name);
      setIsConverting(true);

      try {
        const converted = await convertToPermanentDataUrl(file);
        setMediaUrl(converted);
      } catch (err) {
        console.error('Erro na leitura/conversão do arquivo de imagem:', err);
      } finally {
        setIsConverting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConverting) return;
    if (!mediaUrl.trim()) return;

    setIsConverting(true);
    const permanentMediaUrl = await convertToPermanentDataUrl(mediaUrl);

    const trackToAttach = selectedYoutubeTrack
      ? { 
          ...selectedYoutubeTrack, 
          start_time_seconds: startTimeSeconds,
          duration_seconds: durationSeconds 
        }
      : undefined;

    if (contentType === 'post') {
      await store.createPost({
        media_url: permanentMediaUrl,
        media_type: 'image',
        caption,
        location,
        youtube_track: trackToAttach
      });
    } else if (contentType === 'story') {
      await store.createStory({
        media_url: permanentMediaUrl,
        media_type: 'image',
        youtube_track: trackToAttach
      });
    } else if (contentType === 'reel') {
      await store.createReel({
        video_url: permanentMediaUrl,
        caption,
        youtube_track: trackToAttach
      });
    }

    setIsConverting(false);
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
            <Film className="w-4 h-4" /> Curtas
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
              onClick={() => !isConverting && fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-500/50 hover:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 rounded-2xl p-5 text-center cursor-pointer transition-all hover:scale-[1.01]"
            >
              {isConverting ? (
                <div className="flex flex-col items-center justify-center gap-2.5 py-6">
                  <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-extrabold text-xs text-rose-500">
                    Convertendo arquivo do celular (Base64)...
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Processando via FileReader igual à foto de perfil
                  </span>
                </div>
              ) : mediaUrl ? (
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
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold truncate flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{mediaFileName || 'Arquivo selecionado'} (Convertido com sucesso)</span>
                  </p>
                  <p className="text-[10px] text-neutral-400">Clique para selecionar outro arquivo do celular</p>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Legenda / Descrição
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = caption ? `${caption} @` : '@';
                    setCaption(next);
                    setMentionSuggestions(store.searchProfilesForMention(''));
                    if (captionInputRef.current) captionInputRef.current.focus();
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <AtSign className="w-3 h-3" />
                  <span>Marcar amigo</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  ref={captionInputRef}
                  rows={3}
                  placeholder="Escreva uma legenda incrível... Use @nome para marcar pessoas!"
                  value={caption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCaption(val);
                    const words = val.split(/\s+/);
                    const lastWord = words[words.length - 1];
                    if (lastWord.startsWith('@')) {
                      const q = lastWord.substring(1);
                      setMentionSuggestions(store.searchProfilesForMention(q));
                    } else {
                      setMentionSuggestions([]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />

                {mentionSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30">
                    <MentionInputSuggestions
                      suggestions={mentionSuggestions}
                      onSelect={(profile) => {
                        const words = caption.split(/\s+/);
                        words.pop();
                        words.push(`@${profile.username} `);
                        setCaption(words.join(' '));
                        setMentionSuggestions([]);
                        if (captionInputRef.current) captionInputRef.current.focus();
                      }}
                    />
                  </div>
                )}
              </div>
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

          {/* YouTube Music Live Search & Snippet Picker */}
          <YouTubeMusicPicker
            selectedTrack={selectedYoutubeTrack}
            onSelectTrack={setSelectedYoutubeTrack}
            startTimeSeconds={startTimeSeconds}
            onStartTimeChange={setStartTimeSeconds}
            durationSeconds={durationSeconds}
            onDurationChange={setDurationSeconds}
          />

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
              disabled={!mediaUrl || isConverting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold text-xs shadow-md hover:opacity-95 disabled:opacity-40 transition-opacity flex items-center justify-center gap-1.5"
            >
              {isConverting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Convertendo imagem...</span>
                </>
              ) : (
                <span>Publicar Agora</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
