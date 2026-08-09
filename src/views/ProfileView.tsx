import React, { useState, useRef } from 'react';
import {
  Grid, Film, Bookmark, Music, Settings, Edit3, ExternalLink, UserCheck, UserPlus, X, Check, Globe, Upload, Trash2
} from 'lucide-react';
import { Profile, ProfileType, Post } from '../types';
import { store } from '../services/store';
import { FollowListModal } from '../components/FollowListModal';
import { FeedPost } from '../components/FeedPost';
import { StoryViewerModal } from '../components/StoryViewerModal';

interface Props {
  profileId?: string; // If undefined, displays active profile
  onOpenProfile: (id: string) => void;
  onOpenAccountSwitcher: () => void;
}

export const ProfileView: React.FC<Props> = ({
  profileId,
  onOpenProfile,
  onOpenAccountSwitcher
}) => {
  const activeProfile = store.getActiveProfile();
  const targetId = profileId || activeProfile.id;
  const isSelf = targetId === activeProfile.id;

  const profile = store.getProfiles().find((p) => p.id === targetId) || activeProfile;
  const isFollowing = store.isFollowing(profile.id);

  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved' | 'music'>('posts');
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  // User stories
  const userStories = store.getStories().filter((s) => s.profile_id === profile.id);
  const hasUserStories = userStories.length > 0;
  const [followModalTitle, setFollowModalTitle] = useState<'Seguidores' | 'Seguindo' | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit Profile State
  const [editUsername, setEditUsername] = useState(profile.username);
  const [editFullName, setEditFullName] = useState(profile.full_name);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editWebsite, setEditWebsite] = useState(profile.website || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatar_url);
  const [editType, setEditType] = useState<ProfileType>(profile.profile_type);

  const handleOpenEditModal = () => {
    setEditUsername(profile.username);
    setEditFullName(profile.full_name);
    setEditBio(profile.bio);
    setEditWebsite(profile.website || '');
    setEditAvatarUrl(profile.avatar_url);
    setEditType(profile.profile_type);
    setIsEditModalOpen(true);
  };

  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Content Filter
  const allPosts = store.getPosts();
  const userPosts = allPosts.filter((p) => p.profile_id === profile.id);
  const userReels = store.getReels().filter((r) => r.profile_id === profile.id);
  const savedPosts = store.getSavedPosts();
  const musicPosts = userPosts.filter((p) => !!p.youtube_track);

  // Follower/Following Lists
  const followersList = store.getFollowers(profile.id);
  const followingList = store.getFollowing(profile.id);

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
              <img
                src={profile.avatar_url}
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
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
                  @{profile.username}
                </h1>
                {profile.verified && <span className="text-blue-500 font-bold">✓</span>}
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
                  <button
                    onClick={() => store.toggleFollow(profile.id)}
                    className={`px-5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                      isFollowing
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                        : 'bg-rose-500 text-white'
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
                  {profile.followers_count}
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
                  {profile.following_count}
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
              <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-1 leading-relaxed">
                {profile.bio}
              </p>
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
          { id: 'reels', label: 'Reels', icon: Film },
          ...(isSelf ? [{ id: 'saved', label: 'Salvos', icon: Bookmark }] : []),
          { id: 'music', label: 'Músicas YouTube', icon: Music }
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

      {/* Grid Content Display */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {userPosts.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-xs text-neutral-400">
              Nenhuma publicação cadastrada neste perfil.
            </div>
          ) : (
            userPosts.map((post) => (
              <div
                key={post.id}
                className="aspect-square bg-neutral-900 rounded-xl overflow-hidden group relative cursor-pointer"
              >
                <img
                  src={post.media_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold text-xs gap-3">
                  <div className="flex items-center gap-3">
                    <span>❤️ {post.likes_count}</span>
                    <span>💬 {post.comments_count}</span>
                  </div>
                  {isSelf && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Deseja excluir esta publicação permanentemente?')) {
                          store.deletePost(post.id);
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-lg transition-all hover:scale-105"
                      title="Excluir Post"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reels' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {userReels.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-xs text-neutral-400">
              Nenhum Reels publicado ainda.
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
                      if (confirm('Deseja excluir este Reels?')) {
                        store.deleteReel(reel.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title="Excluir Reels"
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
              <div key={post.id} className="aspect-square bg-neutral-900 rounded-xl overflow-hidden">
                <img src={post.media_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'music' && (
        <div className="space-y-4 max-w-xl mx-auto">
          {musicPosts.length === 0 ? (
            <div className="text-center py-16 text-xs text-neutral-400">
              Nenhuma publicação com música do YouTube anexada.
            </div>
          ) : (
            musicPosts.map((post) => (
              <FeedPost key={post.id} post={post} onOpenProfile={onOpenProfile} />
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
                  Altera seu identificador único no InstaConnect (@usuario).
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
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Biografia (Bio)
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
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

              <div className="flex items-center gap-3 pt-3">
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
      {/* Story Viewer Modal */}
      <StoryViewerModal
        stories={userStories}
        initialIndex={0}
        isOpen={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        onOpenProfile={onOpenProfile}
      />
    </div>
  );
};
