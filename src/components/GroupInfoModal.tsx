import React, { useState, useEffect } from 'react';
import {
  X, Users, Trash2, Camera, Check, User, Building2, UserPlus, UserMinus, Shield, Crown, LogOut, Search, Palette
} from 'lucide-react';
import { Chat, Profile } from '../types';
import { store } from '../services/store';
import { ChatWallpaperModal } from './ChatWallpaperModal';

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
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<Profile | null>(null);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  useEffect(() => {
    if (chat && isOpen) {
      setGroupName(chat.name || '');
      setAvatarUrl(chat.avatar_url || '');
      setIsEditing(false);
      setShowConfirmDelete(false);
      setShowAddMembers(false);
      setSelectedToAdd([]);
      setMemberToRemove(null);
    }
  }, [chat, isOpen]);

  if (!isOpen || !chat || !chat.is_group) return null;

  const activeProfile = store.getActiveProfile();
  const isAdmin = store.isGroupAdmin(chat.id, activeProfile.id);
  const isCreator = chat.created_by === activeProfile.id;

  // Candidates to add to this group: all profiles that are not already participants
  const existingParticipantIds = chat.participants.map((p) => p.id);
  const candidateProfiles = store.getDiscoverableProfiles().filter(
    (p) => !existingParticipantIds.includes(p.id)
  );

  const filteredCandidates = candidateProfiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newUrl = reader.result as string;
        setAvatarUrl(newUrl);
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

  const handleAddSelectedMembers = () => {
    if (selectedToAdd.length === 0) return;
    store.addGroupMembers(chat.id, selectedToAdd);
    setSelectedToAdd([]);
    setShowAddMembers(false);
  };

  const handleConfirmRemoveMember = () => {
    if (!memberToRemove) return;
    store.removeGroupMember(chat.id, memberToRemove.id);
    setMemberToRemove(null);
  };

  const handleLeaveGroup = () => {
    if (window.confirm(`Tem certeza que deseja sair do grupo "${chat.name}"?`)) {
      store.removeGroupMember(chat.id, activeProfile.id);
      onDeleted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[90vh] flex flex-col space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Detalhes do Grupo
            </h3>
          </div>
          {isAdmin && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Administrador
            </span>
          )}
        </div>

        {/* Group Photo & Name Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative group">
            <img
              src={avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80'}
              alt={chat.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-rose-500 shadow-md"
            />
            {isAdmin && (
              <>
                <label
                  htmlFor="edit-group-photo-input"
                  className="absolute bottom-0 right-0 bg-rose-500 text-white p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-rose-600 transition-transform hover:scale-110"
                  title="Trocar foto do grupo pelo celular / dispositivo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </label>
                <input
                  id="edit-group-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          {isAdmin && (
            <label
              htmlFor="edit-group-photo-input"
              className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3 h-3" /> Alterar foto do grupo
            </label>
          )}

          {isEditing && isAdmin ? (
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
              <h4 className="font-extrabold text-lg text-neutral-900 dark:text-white">
                {chat.name}
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-rose-500 hover:underline font-semibold"
                >
                  Editar
                </button>
              )}
            </div>
          )}

          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {chat.participants.length} participante{chat.participants.length !== 1 ? 's' : ''}
          </span>

          {chat.community_id && (() => {
            const comm = store.getCommunity(chat.community_id);
            if (!comm) return null;
            return (
              <div className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                <Building2 className="w-3.5 h-3.5" />
                <span>Comunidade: {comm.name}</span>
              </div>
            );
          })()}

          {/* Wallpaper button */}
          <button
            type="button"
            onClick={() => setIsWallpaperModalOpen(true)}
            className="w-full max-w-xs py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Papel de Parede do Grupo (Individual)</span>
          </button>
        </div>

        {/* Modal Body: Add Members View OR Members List */}
        {showAddMembers ? (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                <UserPlus className="w-4 h-4 text-rose-500" /> Adicionar Participantes
              </span>
              <button
                type="button"
                onClick={() => setShowAddMembers(false)}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 font-medium"
              >
                Voltar
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar usuário para adicionar..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredCandidates.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-400">
                  {candidateProfiles.length === 0
                    ? 'Todos os usuários disponíveis já estão no grupo!'
                    : 'Nenhum usuário encontrado.'}
                </div>
              ) : (
                filteredCandidates.map((p) => {
                  const isChecked = selectedToAdd.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedToAdd((prev) =>
                          isChecked ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                        );
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={p.avatar_url}
                          alt={p.username}
                          className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
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
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-rose-500 rounded border-neutral-300 focus:ring-rose-500 pointer-events-none"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              disabled={selectedToAdd.length === 0}
              onClick={handleAddSelectedMembers}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs shadow hover:opacity-95 disabled:opacity-40 transition-opacity"
            >
              Adicionar {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''} ao Grupo
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Membros ({chat.participants.length})
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddMembers(true)}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Adicionar Membros
                </button>
              )}
            </div>

            {/* Confirm Remove Member Banner */}
            {memberToRemove && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-1.5 text-center animate-in fade-in">
                <p className="text-xs font-bold text-red-600 dark:text-red-400">
                  Remover {memberToRemove.full_name} (@{memberToRemove.username}) do grupo?
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMemberToRemove(null)}
                    className="px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveMember}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
                  >
                    Sim, Remover
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {chat.participants.map((p) => {
                const isMemberCreator = chat.created_by === p.id;
                const isMemberAdmin =
                  isMemberCreator ||
                  (chat.admin_ids && chat.admin_ids.includes(p.id)) ||
                  chat.members?.some((m) => m.profile_id === p.id && m.role === 'admin');

                const canRemoveThisUser = isAdmin && !isMemberCreator && p.id !== activeProfile.id;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                  >
                    <div
                      onClick={() => {
                        onClose();
                        onOpenProfile(p.id);
                      }}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                    >
                      <img
                        src={p.avatar_url}
                        alt={p.username}
                        className="w-8 h-8 rounded-full object-cover border border-rose-500/50"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                            {p.full_name}
                          </span>
                          {isMemberCreator && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center gap-0.5" title="Criador do Grupo">
                              <Crown className="w-2.5 h-2.5" /> Criador
                            </span>
                          )}
                          {!isMemberCreator && isMemberAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center gap-0.5" title="Administrador">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 block truncate">
                          @{p.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Admin toggle button: visible to group creator or group admins */}
                      {(isCreator || isAdmin) && !isMemberCreator && p.id !== activeProfile.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            store.toggleGroupAdmin(chat.id, p.id);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                            isMemberAdmin
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50'
                          }`}
                          title={isMemberAdmin ? 'Remover privilégio de Administrador' : 'Dar Administrador para este membro'}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{isMemberAdmin ? 'Tirar Admin' : 'Dar Admin'}</span>
                        </button>
                      )}

                      {/* Action button: Remove member (if admin) */}
                      {canRemoveThisUser && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToRemove(p);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title={`Remover ${p.full_name} do grupo`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions / Leave or Delete Group */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
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
            <div className="flex items-center gap-2">
              {!isCreator && (
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  className="flex-1 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-neutral-500" /> Sair do Grupo
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex-1 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-200 dark:border-red-900/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Apagar Grupo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {chat && (
        <ChatWallpaperModal
          isOpen={isWallpaperModalOpen}
          onClose={() => setIsWallpaperModalOpen(false)}
          chatId={chat.id}
          chatName={chat.name}
          isGroup={true}
        />
      )}
    </div>
  );
};
