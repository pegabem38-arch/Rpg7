import React, { useState } from 'react';
import {
  X, Building2, Plus, Users, Hash, Shield, ArrowRight, Trash2, UserPlus, UserMinus, Crown, Search, Check, LogOut
} from 'lucide-react';
import { Community, Profile } from '../types';
import { store } from '../services/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  onSelectChat: (chatId: string) => void;
  onOpenCreateGroup: (communityId: string) => void;
  onOpenProfile?: (profileId: string) => void;
}

export const CommunityModal: React.FC<Props> = ({
  isOpen,
  onClose,
  communityId,
  onSelectChat,
  onOpenCreateGroup,
  onOpenProfile
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'members'>('groups');
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [addToAllGroups, setAddToAllGroups] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<Profile | null>(null);

  if (!isOpen) return null;

  const community = store.getCommunity(communityId);
  if (!community) return null;

  const activeProfile = store.getActiveProfile();
  const isCreator = community.created_by === activeProfile.id;
  const isAdmin = store.isCommunityAdmin(community.id, activeProfile.id);

  const groups = store.getCommunityGroups(communityId);
  const allProfiles = store.getProfiles();
  const members = allProfiles.filter((p) => community.member_profile_ids.includes(p.id));

  // Candidates not in community
  const candidateProfiles = allProfiles.filter(
    (p) => !community.member_profile_ids.includes(p.id)
  );
  const filteredCandidates = candidateProfiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  const handleQuickAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup = store.createGroupChat(
      `# ${newGroupName.trim()}`,
      community.member_profile_ids,
      community.avatar_url,
      community.id
    );

    setNewGroupName('');
    setIsAddingGroup(false);
    onSelectChat(newGroup.id);
    onClose();
  };

  const handleAddMembersSubmit = () => {
    if (selectedToAdd.length === 0) return;
    store.addCommunityMembers(community.id, selectedToAdd, addToAllGroups);
    setSelectedToAdd([]);
    setShowAddMembers(false);
  };

  const handleConfirmRemoveMember = () => {
    if (!memberToRemove) return;
    store.removeCommunityMember(community.id, memberToRemove.id);
    setMemberToRemove(null);
  };

  const handleLeaveCommunity = () => {
    if (window.confirm(`Tem certeza que deseja sair da comunidade "${community.name}"? Você também deixará todos os grupos dela.`)) {
      store.removeCommunityMember(community.id, activeProfile.id);
      onClose();
    }
  };

  const handleDeleteCommunity = () => {
    if (window.confirm(`Tem certeza que deseja apagar a comunidade "${community.name}"? Todos os seus grupos serão desvinculados.`)) {
      store.deleteCommunity(community.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative max-h-[90vh] flex flex-col space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Community Header Banner */}
        <div className="flex items-center gap-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <img
            src={community.avatar_url || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&auto=format&fit=crop&q=80'}
            alt={community.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500 shadow-md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Comunidade
              </span>
              {isAdmin && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Administrador
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white truncate mt-1">
              {community.name}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-0.5">
              {community.description || 'Comunidade no RPG'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs: Grupos & Membros */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('groups');
              setShowAddMembers(false);
            }}
            className={`flex-1 pb-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'groups'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Grupos ({groups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 pb-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membros ({members.length})</span>
          </button>
        </div>

        {/* TAB 1: Groups */}
        {activeTab === 'groups' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Canais e Tópicos
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setIsAddingGroup(!isAddingGroup)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar Grupo
                </button>
              )}
            </div>

            {/* Inline Quick Add Group Form */}
            {isAddingGroup && isAdmin && (
              <form onSubmit={handleQuickAddGroup} className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  Criar Novo Grupo na Comunidade:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do grupo (ex: Dúvidas, Projetos, Músicas)..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700 cursor-pointer shadow-sm"
                  >
                    Criar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingGroup(false)}
                    className="px-2 py-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Groups list */}
            <div className="space-y-2">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-400">
                  Nenhum grupo nesta comunidade ainda.
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => {
                      onSelectChat(group.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {group.is_announcement ? '📢' : '💬'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-neutral-900 dark:text-white group-hover:text-purple-600 transition-colors">
                            {group.name}
                          </span>
                          {group.is_announcement && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                              Avisos
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate max-w-xs">
                          {group.last_message?.text || 'Sem mensagens ainda'}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Members & Admin Management */}
        {activeTab === 'members' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {showAddMembers ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                    <UserPlus className="w-4 h-4 text-purple-500" /> Adicionar à Comunidade
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
                    placeholder="Buscar usuários para convidar..."
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredCandidates.length === 0 ? (
                    <div className="text-center py-6 text-xs text-neutral-400">
                      {candidateProfiles.length === 0
                        ? 'Todos os usuários disponíveis já são membros da comunidade!'
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
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-purple-50/50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
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
                            className="w-4 h-4 text-purple-600 rounded border-neutral-300 focus:ring-purple-500 pointer-events-none"
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  <input
                    type="checkbox"
                    id="add-to-all-groups-check"
                    checked={addToAllGroups}
                    onChange={(e) => setAddToAllGroups(e.target.checked)}
                    className="w-3.5 h-3.5 text-purple-600 rounded border-neutral-300 focus:ring-purple-500"
                  />
                  <label htmlFor="add-to-all-groups-check" className="cursor-pointer select-none">
                    Adicionar automaticamente aos canais/grupos desta comunidade
                  </label>
                </div>

                <button
                  type="button"
                  disabled={selectedToAdd.length === 0}
                  onClick={handleAddMembersSubmit}
                  className="w-full py-2 rounded-xl bg-purple-600 text-white font-bold text-xs shadow hover:bg-purple-700 disabled:opacity-40 transition-opacity cursor-pointer"
                >
                  Adicionar {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''} à Comunidade
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Membros ({members.length})
                  </h4>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddMembers(true)}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Adicionar Membros
                    </button>
                  )}
                </div>

                {/* Confirm Remove Member */}
                {memberToRemove && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl space-y-1.5 text-center animate-in fade-in">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">
                      Remover {memberToRemove.full_name} (@{memberToRemove.username}) da comunidade?
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      O usuário também será removido de todos os grupos desta comunidade.
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
                        className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                      >
                        Sim, Remover
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {members.map((m) => {
                    const isMemberCreator = m.id === community.created_by;
                    const isMemberAdmin =
                      isMemberCreator || (community.admin_ids && community.admin_ids.includes(m.id));
                    const canRemoveThisUser = isAdmin && !isMemberCreator && m.id !== activeProfile.id;

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                      >
                        <div
                          onClick={() => {
                            if (onOpenProfile) {
                              onClose();
                              onOpenProfile(m.id);
                            }
                          }}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        >
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-purple-500/50"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                                {m.full_name}
                              </span>
                              {isMemberCreator && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5" /> Criador
                                </span>
                              )}
                              {!isMemberCreator && isMemberAdmin && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5" /> Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-400 block truncate">
                              @{m.username}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Admin toggle button: visible to community creator or admins */}
                          {(isCreator || isAdmin) && !isMemberCreator && m.id !== activeProfile.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                store.toggleCommunityAdmin(community.id, m.id);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                isMemberAdmin
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60'
                                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/50'
                              }`}
                              title={isMemberAdmin ? 'Remover privilégio de Administrador' : 'Dar Administrador da Comunidade para este membro'}
                            >
                              <Shield className="w-3 h-3" />
                              <span>{isMemberAdmin ? 'Tirar Admin' : 'Dar Admin'}</span>
                            </button>
                          )}

                          {canRemoveThisUser && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberToRemove(m);
                              }}
                              className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title={`Remover ${m.full_name} da comunidade`}
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
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            {!isCreator && (
              <button
                type="button"
                onClick={handleLeaveCommunity}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair da Comunidade
              </button>
            )}

            {isCreator && (
              <button
                onClick={handleDeleteCommunity}
                className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Comunidade
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
