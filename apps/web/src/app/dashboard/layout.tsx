'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { LayoutDashboard, Layers, BarChart2, Settings, LogOut, PlusCircle, User, FileText, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import { draftsApi } from '@/lib/api/drafts';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { logout, user, checkAuth } = useAuthStore();
    const { fetchProfiles, profiles, currentProfile } = useProfileStore();
    const [inboxCount, setInboxCount] = useState<number | null>(null);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (user && profiles.length === 0) {
            fetchProfiles();
        }
    }, [user, profiles.length, fetchProfiles]);

    useEffect(() => {
        if (!currentProfile) return;
        draftsApi.list({ profile_id: currentProfile.id, status: 'inbox', limit: 1 })
            .then(res => setInboxCount(res.total))
            .catch(() => {});
    }, [currentProfile?.id]);

    const handleLogout = async () => {
        await logout();
        router.push('/auth');
    };

    return (
        <div className="min-h-screen bg-slate-50/50 flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border/60 z-30 hidden md:flex flex-col">
                <div className="p-6 border-b border-border/40">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 relative rounded-lg overflow-hidden">
                            <Image src="/android-chrome-192x192.png" alt="Pixo Logo" fill className="object-cover" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">Pixo</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    <NavLink href="/dashboard" icon={LayoutDashboard} label="Overview" active />
                    <NavLink href="/dashboard/generate" icon={Sparkles} label="Generate" />
                    <NavLink href="/dashboard/inbox" icon={Layers} label="Inbox" badge={inboxCount !== null && inboxCount > 0 ? String(inboxCount) : undefined} />
                    <NavLink href="/dashboard/drafts" icon={PlusCircle} label="Drafts" />
                    <NavLink href="/dashboard/analytics" icon={BarChart2} label="Analytics" />
                    <NavLink href="/dashboard/settings" icon={Settings} label="Settings" />
                    {user && user.is_admin === true && (
                        <NavLink href="/dashboard/templates" icon={FileText} label="Templates" />
                    )}
                </div>

                <div className="p-4 border-t border-border/40">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <User className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email || 'Free Plan'}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="h-8 w-8"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 min-h-screen flex flex-col transition-all duration-300">
                {/* Top Header (Mobile specific checks usually go here, keeping simple for now) */}
                <header className="h-16 border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center">
                    <h1 className="font-semibold text-lg">Dashboard</h1>
                </header>

                <div className="p-6 md:p-8 animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavLink({ href, icon: Icon, label, active, badge }: { href: string, icon: any, label: string, active?: boolean, badge?: string }) {
    return (
        <Link href={href}>
            <Button variant="ghost" className={`w-full justify-start h-11 gap-3 font-medium ${active ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-slate-50'}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-slate-400'}`} />
                {label}
                {badge && <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
            </Button>
        </Link>
    )
}
