import React from 'react';
import {
  Home, Search, Film, MessageCircle, PlusSquare, Bell, User,
  ChevronDown, Sparkles, ShieldCheck
} from 'lucide-react';
import { Profile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeProfile?: Profile | null;
  unreadNotifications: number;
  unreadChats: number;
  onOpenAccountSwitcher: () => void;
  onOpenCreateModal: () => void;
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  activeProfile,
  unreadNotifications,
  unreadChats,
  onOpenAccountSwitcher,
  onOpenCreateModal,
  isAdmin,
  onOpenAdminPanel
}) => {
  const safeProfile = activeProfile || {
    id: 'unknown',
    username: 'perfil',
    full_name: 'Perfil',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    profile_type: 'pessoal' as const,
    verified: false,
    banned: false
  };

  const navItems = [
    { id: 'feed', label: 'Início', icon: Home },
    { id: 'search', label: 'Pesquisar', icon: Search },
    { id: 'reels', label: 'Curtas', icon: Film },
    { id: 'direct', label: 'Direct', icon: MessageCircle, badge: unreadChats },
    { id: 'notifications', label: 'Notificações', icon: Bell, badge: unreadNotifications },
    { id: 'profile', label: 'Perfil', icon: User, isProfile: true },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 lg:w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-4 z-40 justify-between">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center justify-between px-3 pt-2">
            <button
              onClick={() => onSelectTab('feed')}
              className="flex items-center gap-2 group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-neutral-900 dark:text-white block leading-none">
                  RPG
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-500">
                  Rede Social
                </span>
              </div>
            </button>
          </div>

          {/* Account Context Switcher Box */}
          <button
            onClick={onOpenAccountSwitcher}
            className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={safeProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}
                alt={safeProfile.username}
                className="w-9 h-9 rounded-full object-cover border border-rose-500/40"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    @{safeProfile.username}
                  </span>
                  {safeProfile.verified && (
                    <span className="text-blue-500 text-[11px]">✓</span>
                  )}
                </div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 capitalize inline-block">
                  {safeProfile.profile_type}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0 ml-1" />
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all text-sm font-medium ${
                    isActive
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold shadow-sm'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="relative">
                    {item.isProfile ? (
                      <img
                        src={activeProfile.avatar_url}
                        alt="Profile"
                        className={`w-5 h-5 rounded-full object-cover border ${
                          isActive ? 'border-white dark:border-neutral-900' : 'border-transparent'
                        }`}
                      />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    {item.badge && item.badge > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Dedicated Create Button */}
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-3.5 px-3.5 py-3 mt-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold text-sm shadow-md shadow-rose-500/20 hover:opacity-95 transition-opacity"
            >
              <PlusSquare className="w-5 h-5" />
              <span>Criar Publicação</span>
            </button>

            {/* Exclusive Admin Panel Button (Only visible for cedrico124i@gmail.com) */}
            {isAdmin && onOpenAdminPanel && (
              <button
                onClick={onOpenAdminPanel}
                className="flex items-center justify-between px-3.5 py-3 mt-1 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-rose-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-sm hover:scale-[1.01] transition-transform shadow-sm text-left"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Painel Admin</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-500 text-white shadow-sm">
                  Geral
                </span>
              </button>
            )}

            {/* PWA In-App Install Prompt (Desktop) */}
            <div className="pt-2">
              <PWAInstallButton className="w-full justify-center py-2.5" />
            </div>
          </nav>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 z-40">
        <button
          onClick={onOpenAccountSwitcher}
          className="flex items-center gap-2 text-left"
        >
          <img
            src={activeProfile.avatar_url}
            alt="Profile"
            className="w-7 h-7 rounded-full object-cover border border-rose-500"
          />
          <span className="font-extrabold text-lg tracking-tight text-neutral-900 dark:text-white">
            RPG
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        </button>

        <div className="flex items-center gap-2">
          {/* PWA Install Button (Mobile Header) */}
          <PWAInstallButton />

          {/* Admin Panel Button (Mobile) */}
          {isAdmin && onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 relative"
              title="Painel do Administrador Geral"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-neutral-900" />
            </button>
          )}
          <button
            onClick={() => onSelectTab('notifications')}
            className={`relative p-2 rounded-xl transition-colors ${
              currentTab === 'notifications'
                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50'
                : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-neutral-900" />
            )}
          </button>

          <button
            onClick={() => onSelectTab('direct')}
            className={`relative p-2 rounded-xl transition-colors ${
              currentTab === 'direct'
                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50'
                : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Direct"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadChats > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full min-w-4 text-center">
                {unreadChats}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION (Aba de notificação mantida exclusivamente na barra superior) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around px-2 z-40">
        {navItems
          .filter((item) => item.id !== 'notifications')
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl relative ${
                  isActive ? 'text-rose-500 font-bold' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
              {item.isProfile ? (
                <img
                  src={safeProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}
                  alt="Profile"
                  className={`w-6 h-6 rounded-full object-cover border-2 ${
                    isActive ? 'border-rose-500' : 'border-transparent'
                  }`}
                />
              ) : (
                <Icon className="w-6 h-6" />
              )}
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1.5 right-2 bg-rose-500 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* Mobile Create Floating/Center Button */}
        <button
          onClick={onOpenCreateModal}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 text-white shadow-lg shadow-rose-500/30"
        >
          <PlusSquare className="w-5 h-5" />
        </button>
      </nav>
    </>
  );
};
