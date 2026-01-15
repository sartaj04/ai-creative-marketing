"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import {
    LayoutDashboard,
    Palette,
    Sparkles,
    Image,
    Calendar,
    Settings,
    LogOut,
    ChevronRight,
    CreditCard,
} from "lucide-react";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const { user, isAuthenticated, logout, fetchUser } = useAuthStore();

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Brand Profiles", href: "/dashboard/brands", icon: Palette },
        { name: "Generate", href: "/dashboard/generate", icon: Sparkles },
        { name: "Assets", href: "/dashboard/assets", icon: Image },
        { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
    ];

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-gray-200">
                        <Link href="/dashboard" className="text-2xl font-bold text-primary-500">
                            Pixo
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Usage */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Usage</span>
                                <span className="text-sm font-medium">
                                    {user?.usage_count || 0} / {user?.usage_limit === -1 ? "∞" : user?.usage_limit || 10}
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 rounded-full transition-all"
                                    style={{
                                        width: user?.usage_limit === -1
                                            ? "10%"
                                            : `${Math.min(((user?.usage_count || 0) / (user?.usage_limit || 10)) * 100, 100)}%`
                                    }}
                                />
                            </div>
                            {user?.tier === "free" && (
                                <Link
                                    href="/dashboard/upgrade"
                                    className="flex items-center gap-2 mt-3 text-sm text-primary-500 hover:text-primary-600"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Upgrade Plan
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* User menu */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-primary-600 font-semibold">
                                    {user?.email?.[0]?.toUpperCase() || "U"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.full_name || user?.email}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">{user?.tier} plan</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href="/dashboard/settings"
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50"
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center px-3 py-2 text-sm text-red-600 rounded-lg border border-gray-200 hover:bg-red-50"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-64 min-h-screen">
                {children}
            </main>
        </div>
    );
}
