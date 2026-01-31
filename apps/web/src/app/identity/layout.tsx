'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';

export default function IdentityLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, checkAuth, isLoading } = useAuthStore();
    const { currentProfile, fetchProfiles, profiles } = useProfileStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (user && profiles.length === 0) {
            fetchProfiles();
        }
    }, [user, profiles.length, fetchProfiles]);

    // Redirect to auth if not logged in
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/auth');
        }
    }, [isLoading, user, router]);

    // Wait for auth check
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
            {children}
        </div>
    );
}
