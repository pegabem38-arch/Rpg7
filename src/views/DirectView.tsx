import React, { useState, useEffect } from 'react';
import {
  Search, Users, Plus, Send, Phone, Video, Info, Image, Youtube, Music, ChevronLeft, Trash2
} from 'lucide-react';
import { Chat, DirectMessage, Profile } from '../types';
import { store } from '../services/store';
import { GroupCreateModal } from '../components/GroupCreateModal';
import { GroupInfoModal } from '../components/GroupInfoModal';
import { YouTubePlayerChip } from '../components/YouTubePlayerChip';

interface Props {
  onOpenProfile: (profileId: string) => void;
}

export const DirectView: React.FC<Props> = ({ onOpenProfile }) => {
  const activeProfile = store.getActiveProfile();
  const chats = store.getChats();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    chats.length > 0 ? chats[0].id : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const messages = selectedChatId ? store.getMessages(selectedChatId) : [];

  const otherProfiles = store.getProfiles().filter((p) => p.id !== activeProfile?.id);

  const matchingProfiles = searchTerm.trim()
    ? otherProfiles.filter(
        (p) =>
          p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleStartDirectChat = (profileId: string) => {
    try {
      const chat = store.getOrCreateDirectChat(profileId);
      setSelectedChatId(chat.id);
      setSearchTerm('');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedChatId) {
      store.markChatAsRead(selectedChatId);
    }
  }, [selectedChatId, messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !messageText.trim()) return;

    store.sendMessage(selectedChatId, messageText.trim());
    setMessageText('');
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.is_group) return chat.name || 'Grupo';
    const otherParticipant = chat.participants.find((p) => p.id !== activeProfile.id);
    return otherParticipant ? otherParticipant.full_name : 'Conversa';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.is_group) return chat.avatar_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80';
    const otherParticipant = chat.participants.find((p) => p.id !== activeProfile.id);
    return otherParticipant ? otherParticipant.avatar_url : activeProfile.avatar_url;
  };

  const filteredChats = chats.filter((c) =>
    getChatDisplayName(c).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] p-2 sm:p-4 flex gap-4">
      {/* LEFT PANEL: UNIFIED INBOX */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col shadow-sm ${
          selectedChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Inbox Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-neutral-900 dark:text-white">
              @{activeProfile.username}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
              Direct
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
              title="Criar Grupo"
            >
              <Users className="w-4 h-4" /> + Grupo
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Pesquisar contas (@), nome ou grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Chats and Profiles Search List */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2">
          {/* Section 1: Matching Accounts from Search */}
          {matchingProfiles.length > 0 && (
            <div className="space-y-1 bg-rose-500/5 dark:bg-rose-950/20 p-2 rounded-2xl border border-rose-500/20">
              <div className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-500">
                Contas Encontradas ({matchingProfiles.length})
              </div>
              {matchingProfiles.map((prof) => (
                <div
                  key={prof.id}
                  onClick={() => handleStartDirectChat(prof.id)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-neutral-800 cursor-pointer transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={prof.avatar_url}
                      alt={prof.full_name}
                      className="w-9 h-9 rounded-full object-cover border border-rose-500/50 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                        {prof.full_name}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">
                        @{prof.username}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartDirectChat(prof.id);
                    }}
                    className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors flex-shrink-0 ml-2"
                  >
                    Conversar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Section 2: Active / Filtered Chats */}
          <div>
            {matchingProfiles.length > 0 && filteredChats.length > 0 && (
              <div className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                Conversas Ativas
              </div>
            )}

            {filteredChats.length === 0 && matchingProfiles.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-3">
                <p className="text-xs text-neutral-400">
                  Nenhuma conversa ou conta encontrada para "{searchTerm}".
                </p>
                {otherProfiles.length > 0 && (
                  <div className="pt-2 text-left space-y-2">
                    <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                      Outras contas disponíveis para conversar:
                    </span>
                    <div className="space-y-1">
                      {otherProfiles.map((prof) => (
                        <button
                          key={prof.id}
                          onClick={() => handleStartDirectChat(prof.id)}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-500 hover:text-white transition-all text-left group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={prof.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs block truncate">{prof.full_name}</span>
                              <span className="text-[10px] text-neutral-400 group-hover:text-white/80 block truncate">
                                @{prof.username}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-1 bg-white/20 rounded-md">
                            Mandar DM
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredChats.map((chat) => {
                  const isSelected = chat.id === selectedChatId;
                  const name = getChatDisplayName(chat);
                  const avatar = getChatAvatar(chat);

                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <img
                            src={avatar}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
                          />
                          {chat.is_group && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                              <Users className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                              {name}
                            </span>
                            {chat.last_message && (
                              <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                                {new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/90' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {chat.last_message ? chat.last_message.text : 'Conversa iniciada'}
                          </p>
                        </div>
                      </div>

                      {chat.unread_count > 0 && !isSelected && (
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full flex-shrink-0 ml-2" />
                      )}

                      {chat.is_group && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Deseja realmente apagar o grupo "${name}"?`)) {
                              store.deleteChat(chat.id);
                              if (selectedChatId === chat.id) {
                                const remaining = store.getChats();
                                setSelectedChatId(remaining.length > 0 ? remaining[0].id : null);
                              }
                            }
                          }}
                          className={`p-1.5 rounded-lg opacity-80 hover:opacity-100 transition-all ml-1 ${
                            isSelected
                              ? 'hover:bg-rose-600 text-white'
                              : 'hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500'
                          }`}
                          title="Apagar Grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Extra section when no search term: Quick list of other accounts to start direct chat */}
          {!searchTerm.trim() && otherProfiles.length > 0 && (
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <span className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-2">
                Iniciar Conversa com Outras Contas
              </span>
              <div className="space-y-1">
                {otherProfiles.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => handleStartDirectChat(prof.id)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/70 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={prof.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 block truncate">
                          {prof.full_name}
                        </span>
                        <span className="text-[10px] text-neutral-400 block truncate">
                          @{prof.username}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 group-hover:underline flex-shrink-0">
                      + Mensagem
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: ACTIVE CHAT SCREEN */}
      <div
        className={`flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex-col shadow-sm ${
          selectedChatId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedChatId(null)}
                  className="md:hidden p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {(() => {
                  const otherParticipant = !selectedChat.is_group
                    ? selectedChat.participants.find((p) => p.id !== activeProfile.id)
                    : null;

                  return (
                    <div
                      onClick={() => {
                        if (selectedChat.is_group) {
                          setIsGroupInfoOpen(true);
                        } else if (otherParticipant) {
                          onOpenProfile(otherParticipant.id);
                        }
                      }}
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    >
                      <img
                        src={getChatAvatar(selectedChat)}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-rose-500 group-hover:scale-105 transition-transform"
                      />

                      <div className="min-w-0">
                        <span className="font-bold text-sm text-neutral-900 dark:text-white block truncate group-hover:text-rose-500 transition-colors">
                          {getChatDisplayName(selectedChat)}
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">
                          {selectedChat.is_group
                            ? `${selectedChat.participants.length} participantes • Ver detalhes / apagar`
                            : 'Ativo agora • Clique para ver perfil'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (selectedChat.is_group) {
                      setIsGroupInfoOpen(true);
                    }
                  }}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                  title="Informações do grupo"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-xs text-neutral-400">
                  Envie a primeira mensagem para {getChatDisplayName(selectedChat)} 👋
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.sender_id === activeProfile.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isSelf && (
                        <img
                          src={msg.sender_profile.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                      )}

                      <div className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm ${
                        isSelf
                          ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-xs border border-neutral-200 dark:border-neutral-700'
                      }`}>
                        {!isSelf && selectedChat.is_group && (
                          <span className="font-bold text-[10px] text-rose-500 block mb-1">
                            {msg.sender_profile.full_name}
                          </span>
                        )}

                        {/* Story Media reference if message is a story reply */}
                        {msg.media_url && (
                          <div className="mb-2 rounded-lg overflow-hidden max-w-xs border border-white/20">
                            <img src={msg.media_url} alt="Story" className="w-full h-32 object-cover" />
                          </div>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                        {/* YouTube track if attached */}
                        {msg.youtube_track && (
                          <div className="mt-2">
                            <YouTubePlayerChip track={msg.youtube_track} compact />
                          </div>
                        )}

                        <span className={`text-[9px] mt-1 block text-right ${isSelf ? 'text-white/70' : 'text-neutral-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Enviar mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full disabled:opacity-40 transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
            <Users className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mb-3" />
            <h4 className="font-bold text-lg text-neutral-800 dark:text-neutral-200">
              Suas Mensagens Diretas
            </h4>
            <p className="text-xs max-w-sm mt-1">
              Envie fotos, mensagens privadas e crie conversas em grupo no Direct do InstaConnect.
            </p>
          </div>
        )}
      </div>

      {/* Group Creation Modal */}
      <GroupCreateModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreated={(newChatId) => setSelectedChatId(newChatId)}
      />

      {/* Group Info & Delete Modal */}
      <GroupInfoModal
        chat={selectedChat || null}
        isOpen={isGroupInfoOpen}
        onClose={() => setIsGroupInfoOpen(false)}
        onDeleted={() => {
          const remaining = store.getChats();
          setSelectedChatId(remaining.length > 0 ? remaining[0].id : null);
        }}
        onOpenProfile={onOpenProfile}
      />
    </div>
  );
};
