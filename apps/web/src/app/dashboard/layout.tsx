'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { LayoutDashboard, Layers, BarChart2, Settings, LogOut, PlusCircle, User, FileText, Sparkles, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import { draftsApi } from '@/lib/api/drafts';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { logout, user, checkAuth } = useAuthStore();
    const { fetchProfiles, profiles, currentProfile } = useProfileStore();
    const [inboxCount, setInboxCount] = useState<number | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {/* Desktop Sidebar */}
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

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border/60 z-50 flex flex-col md:hidden transition-transform duration-300 ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="p-6 border-b border-border/40 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                        <div className="w-8 h-8 relative rounded-lg overflow-hidden">
                            <Image src="/android-chrome-192x192.png" alt="Pixo Logo" fill className="object-cover" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">Pixo</span>
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

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
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
                {/* Top Header with Mobile Menu Button */}
                <header className="h-16 border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center gap-4">
                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(true)}
                        className="md:hidden"
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                    
                    <h1 className="font-semibold text-lg">Dashboard</h1>
                </header>

                <div className="p-4 sm:p-6 md:p-8 animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavLink({ href, icon: Icon, label, active, badge, onClick }: { href: string, icon: any, label: string, active?: boolean, badge?: string, onClick?: () => void }) {
    return (
        <Link href={href} onClick={onClick}>
            <Button variant="ghost" className={`w-full justify-start h-11 gap-3 font-medium ${active ? 'bg-primary/5 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-slate-50'}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-slate-400'}`} />
                {label}
                {badge && <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
            </Button>
        </Link>
    )
}
