import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { Navigation } from './components/Navigation';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { CreateModal } from './components/CreateModal';

import { FeedView } from './views/FeedView';
import { SearchView } from './views/SearchView';
import { ReelsView } from './views/ReelsView';
import { DirectView } from './views/DirectView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { OnboardingProfileView } from './components/OnboardingProfileView';
import { GoogleLoginGateway } from './components/GoogleLoginGateway';
import { 
  GoogleUser, 
  getStoredGoogleUser, 
  subscribeToGoogleAuth,
  isAppAdmin 
} from './services/googleAuth';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [, setTick] = useState(0);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => getStoredGoogleUser());

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // Subscribe to Google auth session updates
  useEffect(() => {
    const unsubscribe = subscribeToGoogleAuth((user) => {
      setGoogleUser(user);
    });
    return unsubscribe;
  }, []);

  const [currentTab, setCurrentTab] = useState<string>('feed');
  const [viewedProfileId, setViewedProfileId] = useState<string | undefined>(undefined);

  // Modals
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const activeProfile = store.getActiveProfile();
  const profiles = store.getProfiles();
  const isAdmin = isAppAdmin(googleUser?.email);

  // 1. STEP 1: Mandatory Google (Gmail) Login (Required once)
  if (!googleUser) {
    return (
      <GoogleLoginGateway 
        onLogin={(user) => {
          setGoogleUser(user);
          setTick((t) => t + 1);
        }} 
      />
    );
  }

  // 2. STEP 2: If logged into Google but no profile created yet, show first profile creation
  if (!activeProfile || profiles.length === 0) {
    return (
      <OnboardingProfileView 
        googleUser={googleUser}
        onCreated={() => setTick((t) => t + 1)} 
        onLogout={() => {
          setGoogleUser(null);
          setTick((t) => t + 1);
        }}
      />
    );
  }

  // 3. STEP 3: Main App Interface
  const unreadNotifications = store.getUnreadNotificationCount();
  const unreadChats = store.getUnreadChatCount();

  const handleOpenProfile = (profileId: string) => {
    setViewedProfileId(profileId);
    setCurrentTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'profile') {
      setViewedProfileId(undefined); // Reset to active profile when clicking profile tab
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans antialiased selection:bg-rose-500 selection:text-white pb-20 md:pb-0">
      {/* Banned Profile Notice Banner (Sticky) */}
      {activeProfile.banned && (
        <div className="bg-red-600 text-white text-xs font-bold py-2.5 px-4 text-center sticky top-0 z-50 shadow-md flex items-center justify-center gap-2">
          <span>🚫 Atenção: Este perfil foi suspenso pela Administração do aplicativo. Ações de publicação e interação estão bloqueadas.</span>
        </div>
      )}

      {/* Navigation Layout */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeProfile={activeProfile}
        unreadNotifications={unreadNotifications}
        unreadChats={unreadChats}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminPanel={() => setIsAdminModalOpen(true)}
      />

      {/* Main View Area (offsetted on desktop for sidebar) */}
      <main className="md:pl-64 lg:pl-72 pt-14 md:pt-0 transition-all">
        <ErrorBoundary fallbackTitle="Instabilidade temporária na exibição">
          {currentTab === 'feed' && (
            <FeedView
              onOpenProfile={handleOpenProfile}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
            />
          )}

          {currentTab === 'search' && (
            <SearchView onOpenProfile={handleOpenProfile} />
          )}

          {currentTab === 'reels' && (
            <ReelsView onOpenProfile={handleOpenProfile} />
          )}

          {currentTab === 'direct' && (
            <DirectView onOpenProfile={handleOpenProfile} />
          )}

          {currentTab === 'notifications' && (
            <NotificationsView onOpenProfile={handleOpenProfile} />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              profileId={viewedProfileId}
              onOpenProfile={handleOpenProfile}
              onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
              isAdmin={isAdmin}
              onOpenAdminPanel={() => setIsAdminModalOpen(true)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Account Switcher Modal (Allows 1-click profile switching and adding new profiles under this Google account) */}
      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={(id) => {
          store.switchProfile(id);
          setViewedProfileId(undefined);
        }}
        onGoogleLogout={() => {
          setGoogleUser(null);
          setTick((t) => t + 1);
        }}
      />

      {/* Unified Create Content Modal */}
      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          store.notify();
        }}
      />

      {/* Exclusive Admin Moderation & Settings Modal (Only for cedrico124i@gmail.com) */}
      <AdminSettingsModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={googleUser}
        onOpenProfile={handleOpenProfile}
      />
    </div>
  );
}
