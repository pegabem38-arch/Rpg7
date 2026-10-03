import React, { useState, useRef, useEffect } from 'react';
import {
  Grid, List, Film, Bookmark, Settings, Edit3, ExternalLink, UserCheck, UserPlus, X, Check, Globe, Upload, Trash2, Repeat2, AtSign,
  ShieldCheck, Ban, CheckCircle, RotateCcw, Crown, User, Flag
} from 'lucide-react';
import { Profile, ProfileType, Post } from '../types';
import { store } from '../services/store';
import { ADMIN_EMAIL, isAppAdmin, getStoredGoogleUser } from '../services/googleAuth';
import { FollowListModal } from '../components/FollowListModal';
import { FeedPost } from '../components/FeedPost';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { MentionText } from '../components/MentionText';
import { MentionInputSuggestions } from '../components/MentionInputSuggestions';
import { ReportProfileModal } from '../components/ReportProfileModal';
import { CachedImage } from '../components/CachedImage';

interface Props {
  profileId?: string; // If undefined, displays active profile
  onOpenProfile: (id: string) => void;
  onOpenAccountSwitcher: () => void;
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
}

export const ProfileView: React.FC<Props> = ({
  profileId,
  onOpenProfile,
  onOpenAccountSwitcher,
  isAdmin,
  onOpenAdminPanel
}) => {
  const effectiveIsAdmin = isAdmin ?? isAppAdmin(getStoredGoogleUser()?.email);
  const activeProfile = store.getActiveProfile();
  const targetId = profileId || activeProfile?.id;
  const profile = (profileId ? store.getProfileById(targetId) : activeProfile) || activeProfile;
  const isSelf = (activeProfile && profile) ? (activeProfile.id === profile.id || activeProfile.username === profile.username) : true;

  const [, setTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setTick((t) => t + 1));
  }, []);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [postViewMode, setPostViewMode] = useState<'grid' | 'feed'>('grid');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState<'Seguidores' | 'Seguindo' | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [bioMentionSuggestions, setBioMentionSuggestions] = useState<Profile[]>([]);
  const bioInputRef = useRef<HTMLTextAreaElement | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Profile State
  const [editUsername, setEditUsername] = useState(profile?.username || '');
  const [editFullName, setEditFullName] = useState(profile?.full_name || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editWebsite, setEditWebsite] = useState(profile?.website || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile?.avatar_url || '');
  const [editType, setEditType] = useState<ProfileType>(profile?.profile_type || 'pessoal');

  // Proteção contra perfil inexistente
  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Perfil não encontrado</h2>
        <p className="text-xs text-neutral-500 mt-1">Este perfil não existe ou não está disponível.</p>
        {activeProfile && (
          <button
            onClick={() => onOpenProfile(activeProfile.id)}
            className="mt-6 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold text-xs"
          >
            Voltar ao Meu Perfil
          </button>
        )}
      </div>
    );
  }

  // Outras contas não podem ver a conta logada com cedrico124i@gmail.com
  if (!effectiveIsAdmin && profile.google_email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Perfil não disponível</h2>
        <p className="text-xs text-neutral-500 mt-1">Este perfil não existe ou não está visível para sua conta.</p>
        {activeProfile && (
          <button
            onClick={() => onOpenProfile(activeProfile.id)}
            className="mt-6 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold text-xs"
          >
            Voltar ao Meu Perfil
          </button>
        )}
      </div>
    );
  }

  const isFollowing = store.isFollowing(profile.id);
  const userStories = store.getStories().filter((s) => s && s.profile_id === profile.id);
  const hasUserStories = userStories.length > 0;

  const handleDeleteProfile = () => {
    const result = store.deleteProfile(profile.id);
    setIsEditModalOpen(false);
    setConfirmDeleteOpen(false);
    if (result.remainingCount > 0) {
      const nextActive = store.getActiveProfile();
      if (nextActive) {
        onOpenProfile(nextActive.id);
      }
    }
  };

  const handleOpenEditModal = () => {
    setEditUsername(profile.username);
    setEditFullName(profile.full_name);
    setEditBio(profile.bio);
    setEditWebsite(profile.website || '');
    setEditAvatarUrl(profile.avatar_url);
    setEditType(profile.profile_type);
    setIsEditModalOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Content Filter: Um post pertence estritamente a este perfil se o profile_id corresponder ao ID deste perfil
  const allPosts = store.getPosts() || [];
  const userPosts = allPosts.filter((p) => {
    if (!p) return false;
    // 1. Verificação rigorosa e prioritária pelo ID único do perfil
    if (p.profile_id && profile?.id) {
      return p.profile_id === profile.id;
    }
    // 2. Se profile_id não estiver preenchido, verifica pelo ID do objeto profile
    if (p.profile && p.profile.id && profile?.id) {
      return p.profile.id === profile.id;
    }
    return false;
  });

  const userReels = (store.getReels() || []).filter((r) => {
    if (!r) return false;
    if (r.profile_id && profile?.id) {
      return r.profile_id === profile.id;
    }
    if (r.profile && r.profile.id && profile?.id) {
      return r.profile.id === profile.id;
    }
    return false;
  });
  const savedPosts = store.getSavedPosts() || [];

  // Follower/Following Lists
  const followersList = profile?.id ? (store.getFollowers(profile.id) || []) : [];
  const followingList = profile?.id ? (store.getFollowing(profile.id) || []) : [];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim() || !editFullName.trim()) return;

    store.updateActiveProfile({
      username: editUsername.trim().toLowerCase().replace(/[^a-z0-9._]/g, ''),
      full_name: editFullName.trim(),
      bio: editBio.trim(),
      website: editWebsite.trim(),
      avatar_url: editAvatarUrl.trim(),
      profile_type: editType
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Exclusive Admin Moderation Bar (Visible only for cedrico124i@gmail.com) */}
      {effectiveIsAdmin && (
        <div className="mb-4 p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-neutral-900 dark:text-white">
                  Controle de Moderação Geral
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded bg-amber-500 text-white">
                  Admin
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Gerenciando: <span className="font-bold text-neutral-800 dark:text-neutral-200">@{profile.username}</span> ({profile.google_email || 'sem e-mail'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            {/* Toggle Verified */}
            <button
              onClick={() => store.toggleVerifyProfile(profile.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                profile.verified
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{profile.verified ? 'Remover Selo' : 'Dar Verificado'}</span>
            </button>

            {/* Toggle Ban */}
            {profile.google_email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
              profile.banned ? (
                <button
                  onClick={() => store.toggleBanProfile(profile.id)}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Desbanir Usuário</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const reason = prompt('Motivo da suspensão/banimento de @' + profile.username + ':', 'Violação das regras da comunidade');
                    if (reason !== null) {
                      store.toggleBanProfile(profile.id, reason);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700 shadow-sm transition-all"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Banir Usuário</span>
                </button>
              )
            )}

            {onOpenAdminPanel && (
              <button
                onClick={onOpenAdminPanel}
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-sm"
              >
                Painel Admin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Banned Profile Warning Banner */}
      {profile.banned && (
        <div className="mb-4 p-4 rounded-3xl bg-red-500/10 border-2 border-red-500/40 flex items-start gap-3 text-xs shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Ban className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm text-red-600 dark:text-red-400">
              Conta Suspensa / Banida pelo Administrador
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">
              {profile.ban_reason ? `Motivo: "${profile.ban_reason}"` : 'Esta conta teve suas atividades bloqueadas pelo Administrador geral.'}
            </p>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div
              onClick={() => {
                if (hasUserStories) {
                  setStoryViewerOpen(true);
                }
              }}
              className={`p-1 rounded-full ${
                hasUserStories
                  ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 cursor-pointer hover:scale-105 transition-transform'
                  : ''
              }`}
            >
              <CachedImage
                src={profile.avatar_url}
                cacheKey={`avatar_${profile.id}`}
                alt={profile.username}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-neutral-900 shadow-md"
              />
            </div>
            {isSelf && (
              <button
                onClick={handleOpenEditModal}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-neutral-900 text-white shadow-lg hover:scale-110 transition-transform"
                title="Editar Foto"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Details & Stats */}
          <div className="flex-1 text-center sm:text-left space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
                  @{profile.username}
                </h1>
                {profile.verified && (
                  <span className="text-blue-500 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border border-blue-500/30">
                    ✓ Verificado
                  </span>
                )}
                {profile.banned && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-600 text-white shadow-sm flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Banido
                  </span>
                )}
                {effectiveIsAdmin && isSelf && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 uppercase inline-block self-center sm:self-auto">
                {profile.profile_type}
              </span>

              <div className="flex items-center justify-center gap-2 pt-1 sm:pt-0">
                {isSelf ? (
                  <>
                    <button
                      onClick={handleOpenEditModal}
                      className="px-4 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Editar Perfil (@)
                    </button>
                    <button
                      onClick={onOpenAccountSwitcher}
                      className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-sm hover:bg-rose-600"
                    >
                      Trocar Perfil
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        store.toggleFollow(profile.id);
                        setTick((t) => t + 1);
                      }}
                      className={`px-5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                        isFollowing
                          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                          : 'bg-rose-500 text-white hover:bg-rose-600'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4" /> Seguindo
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" /> Seguir
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      title="Denunciar este perfil ao administrador"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Denunciar</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Clickable Counters Row */}
            <div className="flex items-center justify-center sm:justify-start gap-6 border-y border-neutral-100 dark:border-neutral-800 py-3">
              <div className="text-center sm:text-left">
                <span className="font-extrabold text-neutral-900 dark:text-white text-base block leading-none">
                  {userPosts.length}
                </span>
                <span className="text-xs text-neutral-500">publicações</span>
              </div>

              {/* CLICKABLE FOLLOWERS */}
              <button
                onClick={() => setFollowModalTitle('Seguidores')}
                className="text-center sm:text-left hover:opacity-80 transition-opacity"
              >
                <span className="font-extrabold text-neutral-900 dark:text-white text-base block leading-none">
                  {followersList.length}
                </span>
                <span className="text-xs text-neutral-500 hover:text-rose-500 font-semibold underline">
                  seguidores
                </span>
              </button>

              {/* CLICKABLE FOLLOWING */}
              <button
                onClick={() => setFollowModalTitle('Seguindo')}
                className="text-center sm:text-left hover:opacity-80 transition-opacity"
              >
                <span className="font-extrabold text-neutral-900 dark:text-white text-base block leading-none">
                  {followingList.length}
                </span>
                <span className="text-xs text-neutral-500 hover:text-rose-500 font-semibold underline">
                  seguindo
                </span>
              </button>
            </div>

            {/* Bio & Link */}
            <div>
              <span className="font-bold text-sm text-neutral-900 dark:text-white block">
                {profile.full_name}
              </span>
              <div className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-1 leading-relaxed">
                <MentionText text={profile.bio} onOpenProfile={onOpenProfile} />
              </div>
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1 mt-1.5"
                >
                  <Globe className="w-3.5 h-3.5" /> {profile.website}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center justify-center gap-8 border-b border-neutral-200 dark:border-neutral-800 mb-6">
        {[
          { id: 'posts', label: 'Publicações', icon: Grid },
          { id: 'reels', label: 'Curtas', icon: Film },
          ...(isSelf ? [{ id: 'saved', label: 'Salvos', icon: Bookmark }] : [])
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px ${
                isActive
                  ? 'border-rose-500 text-rose-500'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Posts Tab Content */}
      {activeTab === 'posts' && (
        <div>
          {/* Header Bar with Count and Grid/Feed Switcher */}
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              {userPosts.length} {userPosts.length === 1 ? 'Publicação' : 'Publicações'}
            </span>

            {userPosts.length > 0 && (
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPostViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    postViewMode === 'grid'
                      ? 'bg-white dark:bg-neutral-700 text-rose-500 shadow-sm font-bold'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                  }`}
                  title="Visualização em Grade"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Grade</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostViewMode('feed')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    postViewMode === 'feed'
                      ? 'bg-white dark:bg-neutral-700 text-rose-500 shadow-sm font-bold'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
                  }`}
                  title="Visualização em Feed Completo"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Feed</span>
                </button>
              </div>
            )}
          </div>

          {userPosts.length === 0 ? (
            <div className="text-center py-16 text-xs text-neutral-400">
              Nenhuma publicação cadastrada neste perfil.
            </div>
          ) : postViewMode === 'feed' ? (
            <div className="space-y-6 max-w-xl mx-auto">
              {userPosts.map((post) => (
                <FeedPost key={post.id} post={post} onOpenProfile={onOpenProfile} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square bg-neutral-900 rounded-xl overflow-hidden group relative cursor-pointer"
                >
                  <CachedImage
                    src={post.media_url}
                    cacheKey={`post_${post.id}`}
                    alt=""
                    preferBlobUrl={true}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />

                  {/* Corner Badges */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    {post.repost_of && (
                      <span
                        className="bg-emerald-600/90 text-white p-1 rounded-md shadow-md backdrop-blur-sm"
                        title="Republicação"
                      >
                        <Repeat2 className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold text-xs gap-2 p-2">
                    <div className="flex items-center gap-3">
                      <span>❤️ {post.likes_count}</span>
                      <span>💬 {post.comments_count}</span>
                      {(post.reposts_count || 0) > 0 && (
                        <span>🔁 {post.reposts_count}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/80 font-normal">
                      Toque para abrir
                    </span>
                    {isSelf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Deseja excluir esta publicação permanentemente?')) {
                            store.deletePost(post.id);
                          }
                        }}
                        className="mt-1 px-3 py-1 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-lg transition-all hover:scale-105"
                        title="Excluir Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reels' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {userReels.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-xs text-neutral-400">
              Nenhum Curta publicado ainda.
            </div>
          ) : (
            userReels.map((reel) => (
              <div
                key={reel.id}
                className="aspect-[9/16] bg-neutral-900 rounded-xl overflow-hidden relative group"
              >
                <video src={reel.video_url} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 text-white font-bold text-[10px] bg-black/60 px-2 py-1 rounded-md">
                  ▶ {reel.likes_count}
                </div>
                {isSelf && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Deseja excluir este Curta?')) {
                        store.deleteReel(reel.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title="Excluir Curta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {savedPosts.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-xs text-neutral-400">
              Você ainda não salvou nenhuma publicação.
            </div>
          ) : (
            savedPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="aspect-square bg-neutral-900 rounded-xl overflow-hidden group relative cursor-pointer"
              >
                <CachedImage
                  src={post.media_url}
                  cacheKey={`post_${post.id}`}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold text-xs gap-2 p-2">
                  <div className="flex items-center gap-3">
                    <span>❤️ {post.likes_count}</span>
                    <span>💬 {post.comments_count}</span>
                  </div>
                  <span className="text-[10px] text-white/80 font-normal">
                    Toque para abrir
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}


      {/* Followers / Following Clickable Modal */}
      {followModalTitle && (
        <FollowListModal
          isOpen={!!followModalTitle}
          onClose={() => setFollowModalTitle(null)}
          title={followModalTitle}
          profiles={followModalTitle === 'Seguidores' ? followersList : followingList}
          onOpenProfile={onOpenProfile}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
              Editar Perfil Ativo
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nome de Usuário (@)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-neutral-400 font-bold">@</span>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    placeholder="novo_usuario"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Altera seu identificador único no RPG (@usuario).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Foto de Perfil (Avatar)
                </label>
                <input
                  type="file"
                  ref={avatarFileInputRef}
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <img
                    src={editAvatarUrl}
                    alt="Prévia"
                    className="w-12 h-12 rounded-full object-cover border-2 border-rose-500 shadow"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Escolher do Celular</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Biografia (Bio)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = editBio ? `${editBio} @` : '@';
                      setEditBio(next);
                      setBioMentionSuggestions(store.searchProfilesForMention(''));
                      if (bioInputRef.current) bioInputRef.current.focus();
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <AtSign className="w-3 h-3" />
                    <span>Marcar perfil</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    ref={bioInputRef}
                    rows={3}
                    placeholder="Conte sobre você... Use @usuario para marcar outros perfis!"
                    value={editBio}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBio(val);
                      const words = val.split(/\s+/);
                      const lastWord = words[words.length - 1];
                      if (lastWord.startsWith('@')) {
                        const q = lastWord.substring(1);
                        setBioMentionSuggestions(store.searchProfilesForMention(q));
                      } else {
                        setBioMentionSuggestions([]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  />

                  {bioMentionSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30">
                      <MentionInputSuggestions
                        suggestions={bioMentionSuggestions}
                        onSelect={(p) => {
                          const words = editBio.split(/\s+/);
                          words.pop();
                          words.push(`@${p.username} `);
                          setEditBio(words.join(' '));
                          setBioMentionSuggestions([]);
                          if (bioInputRef.current) bioInputRef.current.focus();
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Link Externo (Website)
                </label>
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Tipo do Perfil
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as ProfileType)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="pessoal">Pessoal 👤</option>
                  <option value="profissional">Profissional / Portfólio 💼</option>
                  <option value="criador">Criador de Conteúdo 🚀</option>
                  <option value="empresa">Empresa / Negócio 🏢</option>
                </select>
              </div>

              {/* Danger Zone: Delete Profile */}
              <div className="pt-4 border-t border-red-200 dark:border-red-900/40">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir este perfil permanentemente</span>
                </button>
                <p className="text-[10px] text-neutral-400 text-center mt-1">
                  Apaga este perfil e todas as suas postagens, stories e curtas.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold text-xs shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Profile */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/60 relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800/40 shadow-sm">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
              Excluir Perfil?
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-3">
              Tem certeza que deseja apagar o perfil <span className="font-bold text-red-500">@{profile.username}</span>?
            </p>

            <div className="bg-red-50 dark:bg-red-950/40 rounded-2xl p-3 border border-red-200/80 dark:border-red-800/40 text-left mb-4 text-[11px] text-red-700 dark:text-red-300 space-y-1">
              <p className="font-semibold">⚠️ Esta ação é irreversível:</p>
              <ul className="list-disc list-inside space-y-0.5 text-neutral-600 dark:text-neutral-400 text-[10px]">
                <li>Todas as fotos e publicações serão excluídas</li>
                <li>Stories e Curtas deste perfil serão apagados</li>
                <li>Sua conta Google continuará conectada ao aplicativo</li>
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-600/30 transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Story Viewer Modal */}
      <StoryViewerModal
        stories={userStories}
        initialIndex={0}
        isOpen={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        onOpenProfile={onOpenProfile}
      />

      {/* Selected Post Modal (Lightbox View) */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative max-w-lg w-full my-auto py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="text-white hover:text-rose-400 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FeedPost
              post={selectedPost}
              onOpenProfile={(id) => {
                setSelectedPost(null);
                onOpenProfile(id);
              }}
            />
          </div>
        </div>
      )}

      {/* Report Profile Modal */}
      <ReportProfileModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportedProfile={profile}
      />
    </div>
  );
};
