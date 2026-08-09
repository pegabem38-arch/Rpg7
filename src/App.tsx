import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { Navigation } from './components/Navigation';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { CreateModal } from './components/CreateModal';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';

import { FeedView } from './views/FeedView';
import { SearchView } from './views/SearchView';
import { ReelsView } from './views/ReelsView';
import { DirectView } from './views/DirectView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { OnboardingProfileView } from './components/OnboardingProfileView';

export default function App() {
  const [, setTick] = useState(0);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const [currentTab, setCurrentTab] = useState<string>('feed');
  const [viewedProfileId, setViewedProfileId] = useState<string | undefined>(undefined);

  // Modals
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSupabaseSettingsOpen, setIsSupabaseSettingsOpen] = useState(false);

  const activeProfile = store.getActiveProfile();
  const profiles = store.getProfiles();

  // If no profiles exist yet, show Onboarding to create the consumer profile
  if (!activeProfile || profiles.length === 0) {
    return <OnboardingProfileView onCreated={() => setTick((t) => t + 1)} />;
  }

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
      {/* Navigation Layout */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeProfile={activeProfile}
        unreadNotifications={unreadNotifications}
        unreadChats={unreadChats}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenSupabaseSettings={() => setIsSupabaseSettingsOpen(true)}
      />

      {/* Main View Area (offsetted on desktop for sidebar) */}
      <main className="md:pl-64 lg:pl-72 pt-14 md:pt-0 transition-all">
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
          />
        )}
      </main>

      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        profiles={profiles}
        activeProfile={activeProfile}
        onSelectProfile={(id) => {
          store.switchProfile(id);
          setViewedProfileId(undefined);
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

      {/* Supabase Connection & SQL Schema Modal */}
      <SupabaseSettingsModal
        isOpen={isSupabaseSettingsOpen}
        onClose={() => setIsSupabaseSettingsOpen(false)}
      />
    </div>
  );
}
