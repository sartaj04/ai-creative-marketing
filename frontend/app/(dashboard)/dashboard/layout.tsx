"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Sparkles,
    ImageIcon,
    Calendar,
    LayoutTemplate,
    User,
    Settings,
    LogOut,
    ChevronDown,
    Menu,
    Bell,
    Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/generate", label: "Generate", icon: Sparkles },
    { href: "/dashboard/assets", label: "Assets", icon: ImageIcon },
    { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
    { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, fetchUser, logout } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) {
            fetchUser().catch(() => {
                router.push("/login");
            });
        }
    }, [isAuthenticated, fetchUser, router]);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 z-40 h-full w-64 border-r bg-background hidden lg:block">
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center border-b px-6">
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <Sparkles className="h-7 w-7 text-primary" />
                            <span className="text-lg font-bold">BrandScale</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Upgrade Banner */}
                    {user?.tier === "free" && (
                        <div className="m-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">Upgrade to Pro</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                                Get unlimited generations and more
                            </p>
                            <Button size="sm" className="w-full" asChild>
                                <Link href="/dashboard/settings#billing">Upgrade</Link>
                            </Button>
                        </div>
                    )}

                    {/* User */}
                    <div className="border-t p-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback>
                                    {user?.email?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user?.email}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {user?.tier} plan
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
                    <button className="lg:hidden">
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="flex-1" />
                    <button className="relative text-muted-foreground hover:text-foreground">
                        <Bell className="h-5 w-5" />
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
                    </button>
                    <Avatar className="h-8 w-8 lg:hidden">
                        <AvatarFallback>
                            {user?.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                </header>

                {/* Page Content */}
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
