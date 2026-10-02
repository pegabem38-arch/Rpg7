import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Users, Plus, Send, Phone, Video, Info, Image, Youtube, Music, ChevronLeft, Trash2, X, Check,
  Mic, Camera, Maximize2, Paperclip, AlertCircle, Building2, Layers, Palette
} from 'lucide-react';
import { Chat, DirectMessage, Profile, YoutubeTrack, Community } from '../types';
import { store } from '../services/store';
import { GroupCreateModal } from '../components/GroupCreateModal';
import { GroupInfoModal } from '../components/GroupInfoModal';
import { CommunityModal } from '../components/CommunityModal';
import { YouTubePlayerChip } from '../components/YouTubePlayerChip';
import { YouTubeMusicPicker } from '../components/YouTubeMusicPicker';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';
import { compressImage } from '../utils/imageCompressor';
import { ChatWallpaperModal } from '../components/ChatWallpaperModal';

interface Props {
  onOpenProfile: (profileId: string) => void;
}

export const DirectView: React.FC<Props> = ({ onOpenProfile }) => {
  const activeProfile = store.getActiveProfile();
  const chats = store.getChats();
  const communities = store.getCommunities();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    chats.length > 0 ? chats[0].id : null
  );
  const [activeInboxTab, setActiveInboxTab] = useState<'all' | 'direct' | 'groups' | 'communities'>('all');
  const [communityModalId, setCommunityModalId] = useState<string | null>(null);
  const [selectedCommunityForGroup, setSelectedCommunityForGroup] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [selectedYoutubeTrack, setSelectedYoutubeTrack] = useState<YoutubeTrack | undefined>(undefined);
  const [startTimeSeconds, setStartTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  // Photo Attachment & Lightbox
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Recording & Audio File
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const messages = selectedChatId ? store.getMessages(selectedChatId) : [];

  // Deletion States
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  const handleConfirmDeleteChat = () => {
    if (!chatToDelete) return;
    const deletedId = chatToDelete.id;
    store.deleteChat(deletedId);
    setShowDeleteModal(false);
    setChatToDelete(null);

    const remainingChats = store.getChats();
    if (selectedChatId === deletedId) {
      setSelectedChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
    setToastFeedback('Conversa do Direct apagada com sucesso.');
    setTimeout(() => setToastFeedback(null), 2500);
  };

  const handleConfirmClearMessages = () => {
    if (!chatToDelete) return;
    store.clearChatMessages(chatToDelete.id);
    setShowDeleteModal(false);
    setChatToDelete(null);
    setToastFeedback('Histórico de mensagens limpo.');
    setTimeout(() => setToastFeedback(null), 2500);
  };

  const handleDeleteMessage = (chatId: string, messageId: string) => {
    store.deleteDirectMessage(chatId, messageId);
    setToastFeedback('Mensagem excluída.');
    setTimeout(() => setToastFeedback(null), 2000);
  };

  const otherProfiles = store.getDiscoverableProfiles().filter((p) => p.id !== activeProfile?.id);

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

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1024, 1024, 0.75);
        setAttachedPhoto(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAttachedPhoto(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedChatId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const audioUrl = event.target.result as string;
          const tempAudio = new Audio(audioUrl);
          tempAudio.onloadedmetadata = () => {
            const dur = Math.round(tempAudio.duration) || 5;
            store.sendMessage(selectedChatId, '', undefined, undefined, {
              audio_url: audioUrl,
              duration: dur
            });
          };
          tempAudio.onerror = () => {
            store.sendMessage(selectedChatId, '', undefined, undefined, {
              audio_url: audioUrl,
              duration: 5
            });
          };
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const startRecording = async () => {
    setRecordingError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador não suporta gravação direta de áudio.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microfone não acessível:', err);
      setRecordingError('Microfone indisponível. Você também pode anexar um arquivo de áudio pelo ícone de anexo.');
      setTimeout(() => setRecordingError(null), 5000);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const stopAndSendRecording = () => {
    if (!selectedChatId) return;
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      cancelRecording();
      return;
    }

    const duration = recordingSeconds || 1;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        store.sendMessage(
          selectedChatId,
          '',
          undefined,
          undefined,
          { audio_url: base64Audio, duration: duration }
        );
      };
      reader.readAsDataURL(audioBlob);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      audioChunksRef.current = [];
    };

    try {
      mediaRecorderRef.current.stop();
    } catch (e) {
      cancelRecording();
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || (!messageText.trim() && !selectedYoutubeTrack && !attachedPhoto)) return;

    store.sendMessage(
      selectedChatId,
      messageText.trim() || (selectedYoutubeTrack ? `Música: ${selectedYoutubeTrack.title}` : ''),
      attachedPhoto || undefined,
      selectedYoutubeTrack ? { 
        ...selectedYoutubeTrack, 
        start_time_seconds: startTimeSeconds,
        duration_seconds: durationSeconds 
      } : undefined
    );
    setMessageText('');
    setAttachedPhoto(null);
    setSelectedYoutubeTrack(undefined);
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.is_group) return chat.name || 'Grupo';
    const otherParticipant = chat.participants?.find((p) => p && p.id !== activeProfile?.id);
    return otherParticipant ? otherParticipant.full_name : 'Conversa';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.is_group) return chat.avatar_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80';
    const otherParticipant = chat.participants?.find((p) => p && p.id !== activeProfile?.id);
    return otherParticipant?.avatar_url || activeProfile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
  };

  const filteredChats = chats.filter((c) => {
    const matchesSearch = getChatDisplayName(c).toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeInboxTab === 'direct') return !c.is_group;
    if (activeInboxTab === 'groups') return c.is_group;
    if (activeInboxTab === 'communities') return false;
    return true;
  });

  const filteredCommunities = communities.filter((comm) =>
    comm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.description.toLowerCase().includes(searchTerm.toLowerCase())
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
              @{activeProfile?.username || 'meu_perfil'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300">
              Direct
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setSelectedCommunityForGroup(undefined);
                setIsGroupModalOpen(true);
              }}
              className="px-2.5 py-1.5 bg-gradient-to-r from-rose-500 to-purple-600 hover:opacity-90 text-white rounded-xl transition-all text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
              title="Criar Grupo ou Comunidade"
            >
              <Plus className="w-3.5 h-3.5" /> Criar
            </button>
          </div>
        </div>

        {/* Inbox Filter Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'direct', label: 'DMs' },
            { id: 'groups', label: 'Grupos' },
            { id: 'communities', label: 'Comunidades 🏛️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveInboxTab(tab.id as any)}
              className={`flex-1 py-1 px-1 text-center font-bold rounded-lg transition-colors text-[11px] truncate cursor-pointer ${
                activeInboxTab === tab.id
                  ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={activeInboxTab === 'communities' ? 'Pesquisar comunidades...' : 'Pesquisar contas (@), nome ou grupos...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Chats and Profiles Search List */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2">
          {activeInboxTab === 'communities' ? (
            /* Dedicated Communities Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Comunidades ({filteredCommunities.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCommunityForGroup(undefined);
                    setIsGroupModalOpen(true);
                  }}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova Comunidade
                </button>
              </div>

              {filteredCommunities.length === 0 ? (
                <div className="text-center py-10 px-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200/50 dark:border-purple-900/30 space-y-3">
                  <Building2 className="w-12 h-12 text-purple-400 mx-auto" />
                  <div>
                    <h5 className="font-bold text-sm text-neutral-900 dark:text-white">
                      Nenhuma comunidade encontrada
                    </h5>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                      Crie uma comunidade para organizar múltiplos grupos e canais temáticos em um só lugar!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCommunityForGroup(undefined);
                      setIsGroupModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Criar Comunidade
                  </button>
                </div>
              ) : (
                filteredCommunities.map((comm) => {
                  const commGroups = store.getCommunityGroups(comm.id);
                  const isUserCreator = Boolean(activeProfile && comm.created_by === activeProfile.id);

                  return (
                    <div
                      key={comm.id}
                      className="p-3 rounded-2xl bg-white dark:bg-neutral-800/70 border border-purple-200/70 dark:border-purple-900/40 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={comm.avatar_url || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&auto=format&fit=crop&q=80'}
                          alt={comm.name}
                          className="w-11 h-11 rounded-2xl object-cover border-2 border-purple-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                              {comm.name}
                            </h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                              {commGroups.length} grupos
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                            {comm.description || 'Comunidade no RPG'}
                          </p>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            {comm.member_profile_ids.length} membros • {isUserCreator ? 'Você é admin' : 'Membro'}
                          </span>
                        </div>
                      </div>

                      {/* Sub-groups inside this community */}
                      <div className="space-y-1 pl-1 border-l-2 border-purple-300 dark:border-purple-800 ml-2">
                        {commGroups.map((g) => {
                          const isGroupSelected = g.id === selectedChatId;
                          return (
                            <button
                              key={g.id}
                              onClick={() => setSelectedChatId(g.id)}
                              className={`w-full text-left px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                isGroupSelected
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'hover:bg-purple-50 dark:hover:bg-purple-950/40 text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              <span className="truncate flex items-center gap-1.5">
                                <span className="text-[11px]">{g.is_announcement ? '📢' : '#'}</span>
                                <span>{g.name}</span>
                              </span>
                              {g.unread_count > 0 && (
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCommunityForGroup(comm.id);
                            setIsGroupModalOpen(true);
                          }}
                          className="flex-1 py-1 px-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Criar Grupo
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommunityModalId(comm.id)}
                          className="py-1 px-3 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <>
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
                    <div
                      key={chat.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedChatId(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedChatId(chat.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left cursor-pointer ${
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

                          {chat.community_id && (() => {
                            const comm = store.getCommunity(chat.community_id);
                            if (!comm) return null;
                            return (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md inline-flex items-center gap-1 mt-0.5 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                              }`}>
                                <Building2 className="w-2.5 h-2.5" /> {comm.name}
                              </span>
                            );
                          })()}

                          <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/90' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {chat.last_message ? chat.last_message.text : 'Conversa iniciada'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {chat.unread_count > 0 && !isSelected && (
                          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatToDelete(chat);
                            setShowDeleteModal(true);
                          }}
                          className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-all ${
                            isSelected
                              ? 'hover:bg-rose-600 text-white'
                              : 'hover:bg-red-100 dark:hover:bg-red-950/50 text-neutral-400 hover:text-red-500'
                          }`}
                          title={chat.is_group ? 'Excluir Grupo' : 'Excluir Direct'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
            </>
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
                  const otherParticipant = !selectedChat.is_group && selectedChat.participants
                    ? selectedChat.participants.find((p) => p && p.id !== activeProfile?.id)
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-neutral-900 dark:text-white truncate group-hover:text-rose-500 transition-colors">
                            {getChatDisplayName(selectedChat)}
                          </span>
                          {selectedChat.community_id && (() => {
                            const comm = store.getCommunity(selectedChat.community_id);
                            if (!comm) return null;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommunityModalId(comm.id);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                title="Ver todos os grupos desta comunidade"
                              >
                                <Building2 className="w-2.5 h-2.5" />
                                <span>{comm.name}</span>
                              </button>
                            );
                          })()}
                        </div>
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

              <div className="flex items-center gap-1 sm:gap-2 text-neutral-600 dark:text-neutral-300">
                <button
                  type="button"
                  onClick={() => setIsWallpaperModalOpen(true)}
                  className="p-2 text-neutral-600 dark:text-neutral-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-full transition-colors"
                  title="Papel de parede da conversa (Exclusivo para você)"
                >
                  <Palette className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                  <Video className="w-4 h-4" />
                </button>
                {selectedChat.is_group && (
                  <button
                    onClick={() => {
                      setIsGroupInfoOpen(true);
                    }}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                    title="Informações do grupo"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setChatToDelete(selectedChat);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                  title="Apagar conversa ou limpar histórico"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            {(() => {
              const currentWallpaper = store.getChatWallpaper(selectedChat.id);
              return (
                <div
                  className={`flex-1 overflow-y-auto p-4 space-y-3 relative transition-all ${
                    !currentWallpaper ? 'bg-neutral-50/50 dark:bg-neutral-900/50' : ''
                  }`}
                  style={
                    currentWallpaper
                      ? {
                          backgroundImage: `url(${currentWallpaper})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundAttachment: 'local'
                        }
                      : undefined
                  }
                >
                  {currentWallpaper && (
                    <div className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 pointer-events-none backdrop-blur-[0.5px]" />
                  )}

                  {messages.length === 0 ? (
                    <div className="text-center py-16 text-xs text-neutral-400 relative z-10">
                      Envie a primeira mensagem para {getChatDisplayName(selectedChat)} 👋
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSelf = Boolean(activeProfile && msg.sender_id === activeProfile.id);

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-1.5 group/msg relative z-10 ${isSelf ? 'justify-end' : 'justify-start'}`}
                        >
                      {!isSelf && (
                        <img
                          src={msg.sender_profile.avatar_url}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                      )}

                      {/* Delete button for own message */}
                      {isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(selectedChat.id, msg.id)}
                          className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all shrink-0 mb-1"
                          title="Excluir mensagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className={`max-w-[82%] rounded-2xl p-3 text-xs shadow-sm ${
                        isSelf
                          ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-xs border border-neutral-200 dark:border-neutral-700'
                      }`}>
                        {!isSelf && selectedChat.is_group && (
                          <span className="font-bold text-[10px] text-rose-500 block mb-1">
                            {msg.sender_profile.full_name}
                          </span>
                        )}

                        {/* Voice Note (Audio Message) */}
                        {msg.audio_url && (
                          <div className="my-1">
                            <VoiceNotePlayer
                              audioUrl={msg.audio_url}
                              duration={msg.audio_duration}
                              isSelf={isSelf}
                            />
                          </div>
                        )}

                        {/* Photo Message */}
                        {msg.media_url && !msg.audio_url && (
                          <div
                            onClick={() => setFullscreenPhoto(msg.media_url!)}
                            className="mb-2 rounded-xl overflow-hidden max-w-xs border border-white/20 cursor-pointer group relative"
                            title="Clique para ampliar a foto"
                          >
                            <img
                              src={msg.media_url}
                              alt="Foto enviada"
                              className="w-full max-h-72 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-5 h-5 drop-shadow" />
                            </div>
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        )}

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

                      {/* Delete button for incoming message */}
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(selectedChat.id, msg.id)}
                          className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all shrink-0 mb-1"
                          title="Excluir mensagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
                </div>
              );
            })()}

            {/* Error banner if microphone fails */}
            {recordingError && (
              <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{recordingError}</span>
                <button type="button" onClick={() => setRecordingError(null)} className="p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Attached Photo banner if any */}
            {attachedPhoto && (
              <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={attachedPhoto}
                    alt="Foto pronta para envio"
                    className="w-11 h-11 rounded-xl object-cover border border-neutral-300 dark:border-neutral-600 shadow-sm"
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                      Foto anexada
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Envie direto ou adicione uma legenda abaixo
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedPhoto(null)}
                  className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg"
                  title="Remover foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Attached music banner if any */}
            {selectedYoutubeTrack && (
              <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Youtube className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    {selectedYoutubeTrack.title}
                  </span>
                  <span className="text-[10px] text-neutral-500 truncate">
                    ({selectedYoutubeTrack.artist})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedYoutubeTrack(undefined)}
                  className="text-neutral-400 hover:text-red-500 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            {isRecording ? (
              /* Live Audio Recording Bar */
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-red-50/80 dark:bg-red-950/40 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse inline-block" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono">
                      {formatRecordingTime(recordingSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 text-red-500 h-4">
                    <span className="w-1 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-3.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-2.5 bg-red-500 rounded-full animate-bounce" />
                    <span className="w-1 h-4 bg-red-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.35s]" />
                  </div>

                  <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                    Gravando áudio...
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors"
                    title="Descartar gravação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={stopAndSendRecording}
                    className="px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                    title="Enviar áudio gravado"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 sm:gap-2">
                {/* Hidden File Inputs for Photo & Audio */}
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <input
                  type="file"
                  ref={audioFileInputRef}
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioFileSelect}
                />

                {/* Photo / Camera Button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  title="Enviar foto da galeria ou câmera"
                  className={`p-2.5 rounded-full transition-all shrink-0 ${
                    attachedPhoto
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-rose-500'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Music Button */}
                <button
                  type="button"
                  onClick={() => setIsMusicPickerOpen(true)}
                  title="Compartilhar música"
                  className={`p-2.5 rounded-full transition-all shrink-0 ${
                    selectedYoutubeTrack
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-red-500'
                  }`}
                >
                  <Music className="w-4 h-4" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder={
                    attachedPhoto
                      ? "Adicione uma legenda para a foto..."
                      : selectedYoutubeTrack
                      ? "Adicione um comentário ou envie a música..."
                      : "Mensagem..."
                  }
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 min-w-0"
                />

                {/* Audio Recording / Attachment / Send Button */}
                {messageText.trim() || selectedYoutubeTrack || attachedPhoto ? (
                  <button
                    type="submit"
                    className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-all shadow-md shrink-0 active:scale-95"
                    title="Enviar mensagem"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={startRecording}
                      title="Gravar mensagem de áudio"
                      className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-600 dark:text-neutral-300 hover:text-rose-500 rounded-full transition-all active:scale-95 shadow-xs"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      title="Enviar arquivo de áudio"
                      className="p-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 rounded-full transition-all hidden sm:flex"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
            <Users className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mb-3" />
            <h4 className="font-bold text-lg text-neutral-800 dark:text-neutral-200">
              Suas Mensagens Diretas
            </h4>
            <p className="text-xs max-w-sm mt-1">
              Envie fotos, mensagens privadas e crie conversas em grupo no Direct do RPG.
            </p>
          </div>
        )}
      </div>

      {/* Group & Community Creation Modal */}
      <GroupCreateModal
        isOpen={isGroupModalOpen}
        initialCommunityId={selectedCommunityForGroup}
        onClose={() => {
          setIsGroupModalOpen(false);
          setSelectedCommunityForGroup(undefined);
        }}
        onCreated={(newChatId) => {
          setSelectedChatId(newChatId);
          setIsGroupModalOpen(false);
          setSelectedCommunityForGroup(undefined);
        }}
      />

      {/* Community Details Modal */}
      {communityModalId && (
        <CommunityModal
          isOpen={!!communityModalId}
          communityId={communityModalId}
          onClose={() => setCommunityModalId(null)}
          onSelectChat={(chatId) => {
            setSelectedChatId(chatId);
            setCommunityModalId(null);
          }}
          onOpenCreateGroup={(commId) => {
            setSelectedCommunityForGroup(commId);
            setCommunityModalId(null);
            setIsGroupModalOpen(true);
          }}
          onOpenProfile={onOpenProfile}
        />
      )}

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

      {/* YouTube Music Picker Modal for Direct Chat */}
      {isMusicPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-600" /> Escolher Música para Enviar no Chat
              </h3>
              <button
                type="button"
                onClick={() => setIsMusicPickerOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <YouTubeMusicPicker
              selectedTrack={selectedYoutubeTrack}
              onSelectTrack={(track) => setSelectedYoutubeTrack(track)}
              startTimeSeconds={startTimeSeconds}
              onStartTimeChange={setStartTimeSeconds}
              durationSeconds={durationSeconds}
              onDurationChange={setDurationSeconds}
            />
            {selectedYoutubeTrack && (
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMusicPickerOpen(false)}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Confirmar Trecho e Anexar ao Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox */}
      {fullscreenPhoto && (
        <div
          onClick={() => setFullscreenPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <button
            type="button"
            onClick={() => setFullscreenPhoto(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar foto"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fullscreenPhoto}
            alt="Foto ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Direct Confirmation Modal */}
      {showDeleteModal && chatToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                  {chatToDelete.is_group ? 'Excluir Grupo' : 'Apagar Direct'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setChatToDelete(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Chat Preview */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
              <img
                src={getChatAvatar(chatToDelete)}
                alt=""
                className="w-12 h-12 rounded-full object-cover border border-neutral-300 dark:border-neutral-600 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                  {getChatDisplayName(chatToDelete)}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate">
                  {chatToDelete.is_group
                    ? `${chatToDelete.participants.length} participantes`
                    : 'Conversa privada'}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              O que você deseja fazer com esta conversa?
            </p>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDeleteChat}
                className="w-full p-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Apagar Conversa Completa</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmClearMessages}
                className="w-full p-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Limpar apenas histórico de mensagens</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setChatToDelete(null);
                }}
                className="w-full py-2.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastFeedback && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 text-white dark:bg-white/95 dark:text-neutral-900 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <span>{toastFeedback}</span>
        </div>
      )}

      {/* Chat Wallpaper Modal */}
      {selectedChat && (
        <ChatWallpaperModal
          isOpen={isWallpaperModalOpen}
          onClose={() => setIsWallpaperModalOpen(false)}
          chatId={selectedChat.id}
          chatName={getChatDisplayName(selectedChat)}
          isGroup={selectedChat.is_group}
        />
      )}
    </div>
  );
};
