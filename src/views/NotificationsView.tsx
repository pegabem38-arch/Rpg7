import React, { useState } from 'react';
import {
  Bell, Heart, MessageCircle, UserPlus, Flame, Mail, CheckCheck, Trash2, Repeat2, AtSign
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import { store } from '../services/store';

interface Props {
  onOpenProfile: (profileId: string) => void;
}

export const NotificationsView: React.FC<Props> = ({ onOpenProfile }) => {
  const [filter, setFilter] = useState<string>('all');
  const notifications = store.getNotifications();

  const readNotifications = notifications.filter((n) => n.is_read);
  const unreadNotifications = notifications.filter((n) => !n.is_read);

  const handleMarkAllRead = () => {
    store.markAllNotificationsAsRead();
  };

  const handleClearRead = () => {
    if (readNotifications.length === 0 && unreadNotifications.length > 0) {
      store.markAllNotificationsAsRead();
      store.clearReadNotifications();
    } else {
      store.clearReadNotifications();
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 fill-rose-500" />
          </div>
        );
      case 'comment':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
        );
      case 'mention':
        return (
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-500 flex items-center justify-center flex-shrink-0">
            <AtSign className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case 'repost':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Repeat2 className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case 'follow':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
        );
      case 'story_reaction':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        );
      case 'direct_message':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-500 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-rose-500" /> Notificações
          </h2>
          <p className="text-xs text-neutral-500">
            Acompanhe curtidas, reações de stories, comentários e seguidores em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadNotifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-xl transition-colors"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5 text-rose-500" />
              <span>Marcar lidas</span>
            </button>
          )}

          <button
            onClick={handleClearRead}
            disabled={notifications.length === 0}
            className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              notifications.length > 0
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm cursor-pointer'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-60'
            }`}
            title="Limpar notificações lidas"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar lidas</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'mention', label: 'Menções @' },
          { id: 'repost', label: 'Republicações 🔁' },
          { id: 'like', label: 'Curtidas ❤️' },
          { id: 'comment', label: 'Comentários 💬' },
          { id: 'follow', label: 'Seguidores 👤' },
          { id: 'story_reaction', label: 'Reações 🔥' },
          { id: 'direct_message', label: 'Direct ✉️' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all ${
              filter === f.id
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-2 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-xs text-neutral-400">
            Nenhuma notificação por enquanto!
          </div>
        ) : (
          filtered.map((notif) => {
            if (!notif) return null;
            const actor = notif.actor_profile || { id: 'unknown', username: 'usuario', avatar_url: '' };

            return (
              <div
                key={notif.id}
                onClick={() => store.markNotificationAsRead(notif.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer ${
                  !notif.is_read
                    ? 'bg-rose-50/50 dark:bg-rose-950/20'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getNotificationIcon(notif.type)}

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (actor.id && actor.id !== 'unknown') {
                        onOpenProfile(actor.id);
                      }
                    }}
                    className="flex items-center gap-2 cursor-pointer min-w-0"
                  >
                    <img
                      src={actor.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="text-xs text-neutral-900 dark:text-white leading-tight">
                        <span className="font-bold mr-1">
                          @{actor.username || 'usuario'}
                        </span>
                        {notif.content}
                      </p>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {/* Target Media Thumbnail if available */}
                  {notif.target_media_url ? (
                    <img
                      src={notif.target_media_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : null}

                  {!notif.is_read && (
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
