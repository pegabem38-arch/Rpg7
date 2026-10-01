import React, { useState, useRef } from 'react';
import { X, Image, Upload, Trash2, Check, Sparkles, Lock, Layers } from 'lucide-react';
import { store } from '../services/store';
import { compressImage } from '../utils/imageCompressor';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  isGroup?: boolean;
}

const PRESET_WALLPAPERS = [
  {
    id: 'cyberpunk',
    title: 'Cyberpunk Neon',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'galaxy',
    title: 'Galáxia Profunda',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'fantasy',
    title: 'Castelo Medieval',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'mystic',
    title: 'Floresta Encantada',
    url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'sunset',
    title: 'Pôr do Sol & Montanhas',
    url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'dark-minimal',
    title: 'Geometria Dark',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'anime-sky',
    title: 'Céu Estrelado Anime',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'ocean',
    title: 'Abismo Oceânico',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&auto=format&fit=crop&q=80'
  }
];

export const ChatWallpaperModal: React.FC<Props> = ({
  isOpen,
  onClose,
  chatId,
  chatName,
  isGroup
}) => {
  const activeProfile = store.getActiveProfile();
  const currentWallpaper = store.getChatWallpaper(chatId);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string | null>(currentWallpaper);
  const [applyToAll, setApplyToAll] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file, 1600, 1600, 0.8);
      setSelectedWallpaper(compressed);
      store.setChatWallpaper(chatId, compressed, applyToAll);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setSelectedWallpaper(url);
    store.setChatWallpaper(chatId, url, applyToAll);
  };

  const handleRemoveWallpaper = () => {
    setSelectedWallpaper(null);
    store.setChatWallpaper(chatId, null, applyToAll);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-rose-500/10 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                Papel de Parede da Conversa
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[240px] sm:max-w-xs">
                {isGroup ? `Grupo: ${chatName}` : `Direct: ${chatName}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Privacy Notice Banner */}
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-900/50 flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-300">
            <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block">Visível Exclusivamente para Você (@{activeProfile?.username})</span>
              <span>Cada perfil personaliza seu próprio fundo. Os outros participantes não veem o seu papel de parede e podem escolher os deles livremente.</span>
            </div>
          </div>

          {/* Upload Custom Wallpaper Button */}
          <div>
            <label className="block text-xs font-bold text-neutral-900 dark:text-white mb-2">
              Foto Personalizada
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCustomUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-purple-500 dark:hover:border-purple-400 flex items-center justify-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all bg-neutral-50/50 dark:bg-neutral-800/40"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Otimizando imagem...' : 'Escolher foto do seu dispositivo'}</span>
            </button>
          </div>

          {/* Current Wallpaper Preview & Remove */}
          {selectedWallpaper && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedWallpaper}
                  alt="Atual"
                  className="w-12 h-12 rounded-xl object-cover border border-purple-500 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    Papel de Parede Ativo
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Aplicado a esta conversa
                  </span>
                </div>
              </div>

              <button
                onClick={handleRemoveWallpaper}
                className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            </div>
          )}

          {/* Preset Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Galeria de Temas RPG</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESET_WALLPAPERS.map((preset) => {
                const isSelected = selectedWallpaper === preset.url;

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`relative rounded-2xl overflow-hidden aspect-[4/3] group border transition-all text-left ${
                      isSelected
                        ? 'ring-3 ring-purple-500 border-purple-500 shadow-md'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    <img
                      src={preset.thumb}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                      <span className="text-[10px] font-bold text-white block truncate leading-tight">
                        {preset.title}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option: Apply to all chats */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => {
                  const val = e.target.checked;
                  setApplyToAll(val);
                  if (selectedWallpaper) {
                    store.setChatWallpaper(chatId, selectedWallpaper, val);
                  }
                }}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
              />
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-neutral-400" />
                <span>Usar como padrão para todas as minhas conversas</span>
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-6 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-neutral-500 text-[11px]">
          <span>⚡ A alteração é salva instantaneamente no seu perfil.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
