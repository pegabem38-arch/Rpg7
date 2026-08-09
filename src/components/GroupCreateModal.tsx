import React, { useState } from 'react';
import { X, Users, Check, Camera } from 'lucide-react';
import { Profile } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (chatId: string) => void;
}

export const GroupCreateModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  const DEFAULT_GROUP_AVATAR = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80';

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const activeProfile = store.getActiveProfile();
  const availableProfiles = store
    .getProfiles()
    .filter((p) => p.id !== activeProfile.id);

  const toggleSelectProfile = (id: string) => {
    if (selectedProfileIds.includes(id)) {
      setSelectedProfileIds(selectedProfileIds.filter((p) => p !== id));
    } else {
      setSelectedProfileIds([...selectedProfileIds, id]);
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedProfileIds.length === 0) return;

    const group = store.createGroupChat(
      groupName.trim(),
      selectedProfileIds,
      avatarUrl.trim()
    );

    onCreated(group.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-rose-500" /> Criar Novo Grupo no Direct
        </h3>

        <form onSubmit={handleCreateGroup} className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Group Photo Selection */}
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="relative group cursor-pointer">
              <img
                src={avatarUrl || DEFAULT_GROUP_AVATAR}
                alt="Foto do Grupo"
                className="w-20 h-20 rounded-full object-cover border-2 border-rose-500 shadow-md group-hover:opacity-90 transition-opacity"
              />
              <label
                htmlFor="group-photo-input"
                className="absolute bottom-0 right-0 bg-rose-500 text-white p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-rose-600 transition-transform hover:scale-110"
                title="Escolher foto do celular / galeria"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="group-photo-input"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            <label
              htmlFor="group-photo-input"
              className="text-xs font-bold text-rose-500 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" /> Escolher foto do dispositivo
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Nome do Grupo
            </label>
            <input
              type="text"
              required
              placeholder="ex: Galera do Futebol ⚽"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Selecione os Participantes ({selectedProfileIds.length} selecionados)
            </label>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50 dark:bg-neutral-800/40">
              {availableProfiles.map((p) => {
                const isSelected = selectedProfileIds.includes(p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSelectProfile(p.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-rose-500 text-white font-semibold'
                        : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <span className="block font-bold leading-tight">{p.full_name}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                          @{p.username}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!groupName.trim() || selectedProfileIds.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold text-xs shadow-md disabled:opacity-40 hover:opacity-95"
            >
              Criar Grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
