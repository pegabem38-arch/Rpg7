import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Music, Volume2, VolumeX, UserPlus, UserCheck, Film, Trash2 } from 'lucide-react';
import { store } from '../services/store';
import { YouTubePlayerChip } from '../components/YouTubePlayerChip';
import { CommentsDrawer } from '../components/CommentsDrawer';

interface Props {
  onOpenProfile: (profileId: string) => void;
}

export const ReelsView: React.FC<Props> = ({ onOpenProfile }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => setTick((t) => t + 1));
  }, []);

  const reels = store.getReels() || [];
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<string | null>(null);

  const activeReel = reels[activeReelIndex] || reels[0];

  const handleNextReel = () => {
    if (activeReelIndex < reels.length - 1) {
      setActiveReelIndex(activeReelIndex + 1);
    } else {
      setActiveReelIndex(0); // Loop back
    }
  };

  const handlePrevReel = () => {
    if (activeReelIndex > 0) {
      setActiveReelIndex(activeReelIndex - 1);
    }
  };

  if (!activeReel || reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 bg-neutral-950 text-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center mb-4 shadow-xl shadow-rose-500/20">
          <Film className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Nenhum Curta publicado</h2>
        <p className="text-xs text-neutral-400 max-w-xs mb-6">
          Seja o primeiro a publicar um vídeo curto (Curtas) no RPG!
        </p>
      </div>
    );
  }

  const activeProfile = store.getActiveProfile();
  const isSelf = activeProfile ? activeProfile.id === activeReel.profile_id : false;
  const isFollowing = activeReel.profile_id ? store.isFollowing(activeReel.profile_id) : false;
  const reelAuthor = activeReel.profile || store.getProfileById(activeReel.profile_id) || {
    id: activeReel.profile_id || 'unknown',
    username: 'aventureiro',
    avatar_url: '',
    full_name: 'Aventureiro',
    profile_type: 'pessoal' as const,
    verified: false,
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
    created_at: new Date().toISOString()
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-0 sm:p-4 bg-neutral-950">
      {/* 9:16 Vertical Video Frame */}
      <div className="relative w-full max-w-sm h-[calc(100vh-4rem)] md:h-[780px] bg-black md:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-neutral-800">
        {/* Video Player Background */}
        <div className="absolute inset-0 z-0 bg-neutral-900">
          <video
            src={activeReel.video_url}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Mute/Unmute Floating Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-rose-400" />}
        </button>

        {/* Navigation Touch Zones (Top half / Bottom half) */}
        <div
          onClick={handlePrevReel}
          className="absolute top-0 left-0 right-0 h-1/2 z-10 cursor-pointer"
        />
        <div
          onClick={handleNextReel}
          className="absolute bottom-0 left-0 right-0 h-1/2 z-10 cursor-pointer"
        />

        {/* Bottom Overlay Content */}
        <div className="relative z-20 mt-auto p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-end justify-between gap-4 pointer-events-auto">
          {/* Left Column: Profile, Caption, Music */}
          <div className="flex-1 space-y-3">
            {/* User Info & Follow */}
            <div className="flex items-center gap-2.5">
              <img
                src={reelAuthor.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}
                alt={reelAuthor.username}
                onClick={() => onOpenProfile(activeReel.profile_id)}
                className="w-10 h-10 rounded-full object-cover border-2 border-rose-500 cursor-pointer"
              />
              <span
                onClick={() => onOpenProfile(activeReel.profile_id)}
                className="font-bold text-sm text-white cursor-pointer hover:underline"
              >
                @{reelAuthor.username}
              </span>

              {!isSelf && (
                <button
                  onClick={() => {
                    store.toggleFollow(activeReel.profile_id);
                    setTick((t) => t + 1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
                    isFollowing
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </button>
              )}
            </div>

            {/* Caption */}
            <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">
              {activeReel.caption}
            </p>

            {/* YouTube Track Chip if present */}
            {activeReel.youtube_track && (
              <YouTubePlayerChip track={activeReel.youtube_track} compact />
            )}
          </div>

          {/* Right Floating Action Buttons */}
          <div className="flex flex-col items-center gap-5 text-white">
            {/* Like */}
            <button
              onClick={() => store.toggleLikeReel(activeReel.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all group-hover:scale-110">
                <Heart
                  className={`w-6 h-6 ${
                    activeReel.is_liked ? 'text-rose-500 fill-rose-500' : 'text-white'
                  }`}
                />
              </div>
              <span className="text-[11px] font-bold">
                {activeReel.likes_count.toLocaleString()}
              </span>
            </button>

            {/* Comments */}
            <button
              onClick={() => setActiveCommentsReelId(activeReel.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all group-hover:scale-110">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold">{activeReel.comments_count}</span>
            </button>

            {/* Share */}
            <button className="flex flex-col items-center gap-1 group">
              <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all group-hover:scale-110">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold">{activeReel.shares_count}</span>
            </button>

            {/* Delete Reel if belongs to active user */}
            {activeReel.profile_id === store.getActiveProfile().id && (
              <button
                onClick={() => {
                  if (confirm('Deseja realmente excluir este Curta?')) {
                    store.deleteReel(activeReel.id);
                    if (activeReelIndex > 0) {
                      setActiveReelIndex(activeReelIndex - 1);
                    } else {
                      setActiveReelIndex(0);
                    }
                  }
                }}
                className="flex flex-col items-center gap-1 group"
                title="Excluir Curta"
              >
                <div className="p-3 rounded-full bg-red-600/80 hover:bg-red-600 backdrop-blur-md transition-all group-hover:scale-110 shadow-lg">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-red-400">Excluir</span>
              </button>
            )}

            {/* Rotating Disc Icon for Audio */}
            <div className="w-9 h-9 rounded-full border-2 border-white/60 bg-neutral-800 p-1 animate-spin overflow-hidden">
              <img
                src={activeReel.profile.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Comments Drawer Modal for Reels */}
      <CommentsDrawer
        postId={activeReel.id}
        comments={store.getComments(activeReel.id)}
        isOpen={!!activeCommentsReelId}
        onClose={() => setActiveCommentsReelId(null)}
        onOpenProfile={onOpenProfile}
      />
    </div>
  );
};
