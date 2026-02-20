'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { LayoutDashboard, Layers, BarChart2, Settings, PlusCircle, User, FileText, Sparkles, Menu, X, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import { draftsApi } from '@/lib/api/drafts';
import { membersApi, type Invitation } from '@/lib/api/members';
import { ProfileSwitcher } from '@/components/profile-switcher';
import { InvitationInbox } from '@/components/invitation-inbox';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { logout, user, checkAuth, isHydrated, isLoading } = useAuthStore();
    const { fetchProfiles, profiles, currentProfile } = useProfileStore();
    const [inboxCount, setInboxCount] = useState<number | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [invitationInboxOpen, setInvitationInboxOpen] = useState(false);
    const prevProfileId = useRef(currentProfile?.id);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (isHydrated && !isLoading && !user) {
            router.push('/auth');
        }
    }, [isHydrated, isLoading, user, router]);

    useEffect(() => {
        if (user && profiles.length === 0) {
            fetchProfiles();
        }
    }, [user, profiles.length, fetchProfiles]);

    useEffect(() => {
        if (!currentProfile) return;
        draftsApi.list({ profile_id: currentProfile.id, status: 'inbox', limit: 1 })
            .then(res => setInboxCount(res.total))
            .catch(() => { });
    }, [currentProfile?.id]);

    useEffect(() => {
        if (prevProfileId.current && prevProfileId.current !== currentProfile?.id) {
            setTransitioning(true);
            const timer = setTimeout(() => setTransitioning(false), 300);
            return () => clearTimeout(timer);
        }
        prevProfileId.current = currentProfile?.id;
    }, [currentProfile?.id]);

    const fetchInvitations = async () => {
        try {
            const res = await membersApi.listInvitations();
            setInvitations(res.invitations);
        } catch { }
    };

    useEffect(() => {
        if (user) {
            fetchInvitations();
        }
    }, [user]);

    const handleLogout = async () => {
        await logout();
        router.push('/auth');
    };

    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            {/* Unified Top Header */}
            <header className="h-14 border-b border-border/40 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center gap-3">
                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden h-8 w-8"
                >
                    <Menu className="w-5 h-5" />
                </Button>

                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 relative rounded-lg overflow-hidden">
                        <Image src="/android-chrome-192x192.png" alt="Pixo Logo" fill sizes="28px" className="object-cover" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-foreground hidden sm:inline">Pixo</span>
                </Link>

                {/* Divider */}
                <div className="w-px h-6 bg-border/60" />

                {/* Profile Switcher */}
                <ProfileSwitcher
                    onLogout={handleLogout}
                    invitationCount={invitations.length}
                    onOpenInvitations={() => setInvitationInboxOpen(true)}
                />

                {/* Spacer */}
                <div className="flex-1" />
            </header>

            <div className="flex flex-1">
                {/* Desktop Sidebar */}
                <aside className="fixed left-0 top-14 bottom-0 w-60 bg-white border-r border-border/60 z-20 hidden md:flex flex-col">
                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/dashboard'} />
                        <NavLink href="/dashboard/generate" icon={Sparkles} label="Generate Content" active={pathname === '/dashboard/generate'} />
                        <NavLink href="/dashboard/inbox" icon={Layers} label="Review Inbox" active={pathname === '/dashboard/inbox'} badge={inboxCount !== null && inboxCount > 0 ? String(inboxCount) : undefined} />
                        <NavLink href="/dashboard/drafts" icon={PlusCircle} label="Content Pipeline" active={pathname === '/dashboard/drafts'} />
                        <NavLink href="/dashboard/analytics" icon={BarChart2} label="Content Analytics" active={pathname === '/dashboard/analytics'} />
                        <NavLink href="/dashboard/settings" icon={Settings} label="Settings" active={pathname === '/dashboard/settings'} />
                        {user && user.is_admin === true && (
                            <NavLink href="/dashboard/templates" icon={FileText} label="Content Templates" active={pathname === '/dashboard/templates'} />
                        )}
                    </div>
                </aside>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile Sidebar */}
                <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border/60 z-50 flex flex-col md:hidden transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-14 px-4 border-b border-border/40 flex items-center justify-between">
                        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                            <div className="w-7 h-7 relative rounded-lg overflow-hidden">
                                <Image src="/android-chrome-192x192.png" alt="Pixo Logo" fill sizes="28px" className="object-cover" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-foreground">Pixo</span>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(false)}
                            className="h-8 w-8"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/dashboard'} onClick={() => setMobileMenuOpen(false)} />
                        <NavLink href="/dashboard/generate" icon={Sparkles} label="Generate Content" active={pathname === '/dashboard/generate'} onClick={() => setMobileMenuOpen(false)} />
                        <NavLink href="/dashboard/inbox" icon={Layers} label="Review Inbox" active={pathname === '/dashboard/inbox'} badge={inboxCount !== null && inboxCount > 0 ? String(inboxCount) : undefined} onClick={() => setMobileMenuOpen(false)} />
                        <NavLink href="/dashboard/drafts" icon={PlusCircle} label="Content Pipeline" active={pathname === '/dashboard/drafts'} onClick={() => setMobileMenuOpen(false)} />
                        <NavLink href="/dashboard/analytics" icon={BarChart2} label="Content Analytics" active={pathname === '/dashboard/analytics'} onClick={() => setMobileMenuOpen(false)} />
                        <NavLink href="/dashboard/settings" icon={Settings} label="Settings" active={pathname === '/dashboard/settings'} onClick={() => setMobileMenuOpen(false)} />
                        {user && user.is_admin === true && (
                            <NavLink href="/dashboard/templates" icon={FileText} label="Content Templates" active={pathname === '/dashboard/templates'} onClick={() => setMobileMenuOpen(false)} />
                        )}
                    </div>

                    <div className="p-4 border-t border-border/40">
                        <button
                            onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors w-full text-left text-sm text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 md:ml-60 min-h-[calc(100vh-3.5rem)] flex flex-col">
                    <div className={`p-4 sm:p-6 md:p-8 animate-fade-in transition-opacity duration-300 ${transitioning ? 'opacity-40' : 'opacity-100'}`}>
                        {children}
                    </div>
                </main>
            </div>

            <InvitationInbox
                open={invitationInboxOpen}
                onOpenChange={setInvitationInboxOpen}
                invitations={invitations}
                onInvitationHandled={fetchInvitations}
            />
        </div>
    );
}

function NavLink({ href, icon: Icon, label, active, badge, onClick }: { href: string, icon: any, label: string, active?: boolean, badge?: string, onClick?: () => void }) {
    return (
        <Link href={href} onClick={onClick}>
            <Button variant="ghost" className={`w-full justify-start h-10 gap-3 font-medium text-sm ${active ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-slate-50'}`}>
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-primary' : 'text-slate-400'}`} />
                {label}
                {badge && <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
            </Button>
        </Link>
    )
}
