import React, { useState } from 'react';
import { X, Users, Check, Camera, Building2, Plus, Layers, Sparkles } from 'lucide-react';
import { Profile, Community } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (chatId: string) => void;
  initialCommunityId?: string; // Preselect when creating group from within community
}

export const GroupCreateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreated,
  initialCommunityId
}) => {
  const [mode, setMode] = useState<'group' | 'community'>(initialCommunityId ? 'group' : 'group');
  
  // Group state
  const [groupName, setGroupName] = useState('');
  const [groupAvatarUrl, setGroupAvatarUrl] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>(initialCommunityId || '');
  
  // Community state
  const [communityName, setCommunityName] = useState('');
  const [communityDescription, setCommunityDescription] = useState('');
  const [communityAvatarUrl, setCommunityAvatarUrl] = useState('');
  const [customSubGroups, setCustomSubGroups] = useState<string[]>(['Dúvidas & Ajuda']);
  const [newSubGroupInput, setNewSubGroupInput] = useState('');

  // Common: Members selection
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  const DEFAULT_GROUP_AVATAR = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80';
  const DEFAULT_COMMUNITY_AVATAR = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&auto=format&fit=crop&q=80';

  if (!isOpen) return null;

  const activeProfile = store.getActiveProfile();
  const availableProfiles = store
    .getProfiles()
    .filter((p) => p.id !== activeProfile.id);
  const myCommunities = store.getCommunities();

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'group' | 'community') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'group') {
          setGroupAvatarUrl(reader.result as string);
        } else {
          setCommunityAvatarUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSelectProfile = (id: string) => {
    if (selectedProfileIds.includes(id)) {
      setSelectedProfileIds(selectedProfileIds.filter((p) => p !== id));
    } else {
      setSelectedProfileIds([...selectedProfileIds, id]);
    }
  };

  const handleAddSubGroup = () => {
    if (!newSubGroupInput.trim()) return;
    if (!customSubGroups.includes(newSubGroupInput.trim())) {
      setCustomSubGroups([...customSubGroups, newSubGroupInput.trim()]);
    }
    setNewSubGroupInput('');
  };

  const handleRemoveSubGroup = (name: string) => {
    setCustomSubGroups(customSubGroups.filter((g) => g !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'group') {
      if (!groupName.trim() || selectedProfileIds.length === 0) return;

      const group = store.createGroupChat(
        groupName.trim(),
        selectedProfileIds,
        groupAvatarUrl.trim() || undefined,
        selectedCommunityId || undefined
      );

      onCreated(group.id);
      onClose();
    } else {
      // Create Community with multiple sub-groups
      if (!communityName.trim() || selectedProfileIds.length === 0) return;

      const result = store.createCommunity({
        name: communityName.trim(),
        description: communityDescription.trim() || 'Comunidade oficial no RPG',
        memberProfileIds: selectedProfileIds,
        avatarUrl: communityAvatarUrl.trim() || undefined,
        initialGroupNames: customSubGroups
      });

      onCreated(result.defaultChat.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs: Grupo vs Comunidade */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'group'
                ? 'bg-white dark:bg-neutral-900 text-rose-500 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Users className="w-4 h-4" /> Grupo Comum
          </button>

          <button
            type="button"
            onClick={() => setMode('community')}
            className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'community'
                ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Building2 className="w-4 h-4" /> Criar Comunidade 🏛️
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
          {mode === 'group' ? (
            /* GROUP FORM */
            <>
              <div className="flex flex-col items-center justify-center py-1 space-y-2">
                <div className="relative group cursor-pointer">
                  <img
                    src={groupAvatarUrl || DEFAULT_GROUP_AVATAR}
                    alt="Foto do Grupo"
                    className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 shadow-md group-hover:opacity-90 transition-opacity"
                  />
                  <label
                    htmlFor="group-photo-input"
                    className="absolute bottom-0 right-0 bg-rose-500 text-white p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-rose-600 transition-transform hover:scale-110"
                    title="Escolher foto do dispositivo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input
                    id="group-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, 'group')}
                    className="hidden"
                  />
                </div>
                <label
                  htmlFor="group-photo-input"
                  className="text-xs font-bold text-rose-500 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" /> Escolher foto do grupo
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nome do Grupo *
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

              {/* Optional: Associate with Community */}
              {myCommunities.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-500" /> Vincular a uma Comunidade (opcional)
                  </label>
                  <select
                    value={selectedCommunityId}
                    onChange={(e) => setSelectedCommunityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Nenhuma (grupo isolado)</option>
                    {myCommunities.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏛️ {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            /* COMMUNITY FORM */
            <>
              {/* Community Info Banner */}
              <div className="p-3 bg-gradient-to-r from-rose-500/10 to-purple-600/10 border border-rose-500/20 rounded-xl text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                  <Sparkles className="w-4 h-4" />
                  <span>O que é uma Comunidade?</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Uma Comunidade é um espaço central onde você pode <strong>reunir e criar múltiplos grupos</strong> organizados por tópicos, canais de avisos e discussões.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-1 space-y-2">
                <div className="relative group cursor-pointer">
                  <img
                    src={communityAvatarUrl || DEFAULT_COMMUNITY_AVATAR}
                    alt="Foto da Comunidade"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500 shadow-md group-hover:opacity-90 transition-opacity"
                  />
                  <label
                    htmlFor="comm-photo-input"
                    className="absolute bottom-0 right-0 bg-purple-600 text-white p-1.5 rounded-full shadow-lg cursor-pointer hover:bg-purple-700 transition-transform hover:scale-110"
                    title="Escolher foto da comunidade"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                  <input
                    id="comm-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, 'community')}
                    className="hidden"
                  />
                </div>
                <label
                  htmlFor="comm-photo-input"
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" /> Escolher foto / logotipo da comunidade
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nome da Comunidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Clube dos Gamers RPG 🎮"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Descrição da Comunidade
                </label>
                <textarea
                  rows={2}
                  placeholder="Sobre o que é esta comunidade e quais os objetivos..."
                  value={communityDescription}
                  onChange={(e) => setCommunityDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Sub-groups preview and addition */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-500" /> Grupos iniciais da comunidade:
                  </span>
                  <span className="text-[11px] text-purple-500 font-semibold">
                    {2 + customSubGroups.length} grupos
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-semibold flex items-center gap-1">
                    📢 Avisos & Regras (padrão)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-semibold flex items-center gap-1">
                    💬 Geral (padrão)
                  </span>
                  {customSubGroups.map((gName) => (
                    <span
                      key={gName}
                      className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-semibold flex items-center gap-1.5"
                    >
                      <span>#{gName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubGroup(gName)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add another sub-group */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-200 dark:border-neutral-700/60">
                  <input
                    type="text"
                    placeholder="Adicionar outro grupo (ex: Dúvidas, Eventos, Torneios)..."
                    value={newSubGroupInput}
                    onChange={(e) => setNewSubGroupInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubGroup();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubGroup}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Members Selection (Common) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {mode === 'community'
                ? `Membros iniciais da Comunidade (${selectedProfileIds.length} selecionados) *`
                : `Selecione os Participantes (${selectedProfileIds.length} selecionados) *`}
            </label>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50 dark:bg-neutral-800/40">
              {availableProfiles.length === 0 ? (
                <div className="text-center py-4 text-xs text-neutral-400">
                  Nenhum outro perfil disponível.
                </div>
              ) : (
                availableProfiles.map((p) => {
                  const isSelected = selectedProfileIds.includes(p.id);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSelectProfile(p.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? mode === 'community'
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'bg-rose-500 text-white font-semibold'
                          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover"
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
                })
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                selectedProfileIds.length === 0 ||
                (mode === 'group' && !groupName.trim()) ||
                (mode === 'community' && !communityName.trim())
              }
              className={`flex-1 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer ${
                mode === 'community'
                  ? 'bg-gradient-to-r from-purple-600 to-rose-600 hover:opacity-95'
                  : 'bg-rose-500 hover:bg-rose-600'
              } disabled:opacity-40`}
            >
              {mode === 'community' ? 'Criar Comunidade' : 'Criar Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
