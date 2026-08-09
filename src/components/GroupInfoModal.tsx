import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Camera, Check, User } from 'lucide-react';
import { Chat } from '../types';
import { store } from '../services/store';

interface Props {
  chat: Chat | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onOpenProfile: (profileId: string) => void;
}

export const GroupInfoModal: React.FC<Props> = ({
  chat,
  isOpen,
  onClose,
  onDeleted,
  onOpenProfile
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (chat && isOpen) {
      setGroupName(chat.name || '');
      setAvatarUrl(chat.avatar_url || '');
      setIsEditing(false);
      setShowConfirmDelete(false);
    }
  }, [chat, isOpen]);

  if (!isOpen || !chat || !chat.is_group) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newUrl = reader.result as string;
        setAvatarUrl(newUrl);
        // Automatically save updated avatar to store
        store.updateGroupChat(chat.id, { avatar_url: newUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    store.updateGroupChat(chat.id, { name: groupName.trim() });
    setIsEditing(false);
  };

  const handleDeleteGroup = () => {
    store.deleteChat(chat.id);
    onDeleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[85vh] flex flex-col space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-rose-500" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            Detalhes do Grupo
          </h3>
        </div>

        {/* Group Photo & Name Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative group">
            <img
              src={avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80'}
              alt={chat.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-rose-500 shadow-md"
            />
            <label
              htmlFor="edit-group-photo-input"
              className="absolute bottom-0 right-0 bg-rose-500 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-rose-600 transition-transform hover:scale-110"
              title="Trocar foto do grupo pelo celular / dispositivo"
            >
              <Camera className="w-4 h-4" />
            </label>
            <input
              id="edit-group-photo-input"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
          </div>

          <label
            htmlFor="edit-group-photo-input"
            className="text-xs font-bold text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5" /> Alterar foto do grupo (do seu celular)
          </label>

          {isEditing ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 w-full max-w-xs">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                autoFocus
              />
              <button
                type="submit"
                className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600"
              >
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xl text-neutral-900 dark:text-white">
                {chat.name}
              </h4>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-rose-500 hover:underline font-semibold"
              >
                Editar
              </button>
            </div>
          )}

          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {chat.participants.length} participantes
          </span>
        </div>

        {/* Participants List */}
        <div className="flex-1 min-h-0 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
            Membros
          </span>
          <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
            {chat.participants.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onClose();
                  onOpenProfile(p.id);
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={p.avatar_url}
                    alt={p.username}
                    className="w-8 h-8 rounded-full object-cover border border-rose-500/50"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                      {p.full_name}
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">
                      @{p.username}
                    </span>
                  </div>
                </div>
                <User className="w-4 h-4 text-neutral-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions / Delete Group */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          {showConfirmDelete ? (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-3 space-y-2 text-center">
              <p className="text-xs font-bold text-red-600 dark:text-red-400">
                Tem certeza que deseja apagar o grupo "{chat.name}"?
              </p>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Esta ação apagará todas as mensagens e não pode ser desfeita.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
                >
                  Sim, Apagar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-red-200 dark:border-red-900/40"
            >
              <Trash2 className="w-4 h-4" /> Apagar Grupo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
