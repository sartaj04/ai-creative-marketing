'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import { Sidebar } from '@/components/layout/sidebar';
import { onboardingApi } from '@/lib/api/onboarding';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, isLoading: authLoading } = useAuthStore();
  const { fetchProfiles } = useProfileStore();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfiles();
    }
  }, [isAuthenticated, fetchProfiles]);

  // Check if user needs onboarding via identity_graph completion
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || authLoading || onboardingChecked) return;

      try {
        const status = await onboardingApi.getStatus();
        console.log('Onboarding status:', status);
        
        // Mark as checked first to prevent re-checking
        setOnboardingChecked(true);
        
        // If onboarding is not complete, redirect immediately
        if (!status.is_complete) {
          console.log('Onboarding not complete, redirecting to onboarding...');
          router.push('/onboarding');
          return;
        }
      } catch (error) {
        // If status check fails (e.g., no profile yet), redirect to onboarding
        console.error('Failed to check onboarding status:', error);
        setOnboardingChecked(true);
        router.push('/onboarding');
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, authLoading, onboardingChecked, router]);

  if (authLoading || !onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/30">{children}</main>
    </div>
  );
}
