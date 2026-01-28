'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth, isLoading: authLoading } = useAuthStore();
  const { fetchProfiles, profiles } = useProfileStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfiles();
    }
  }, [isAuthenticated, fetchProfiles]);

  // Check if user needs onboarding
  useEffect(() => {
    if (isAuthenticated && profiles.length === 0 && !authLoading) {
      // Give time for profiles to load
      const timer = setTimeout(() => {
        if (profiles.length === 0) {
          router.push('/onboarding');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, profiles, authLoading, router]);

  if (authLoading) {
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
