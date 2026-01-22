"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import {
    LayoutDashboard,
    FileCode,
    History,
    Settings,
    LogOut,
    ArrowLeft,
    Shield,
} from "lucide-react";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, isInitialized, logout, fetchUser } = useAuthStore();


    useEffect(() => {
        if (!isInitialized) {
            fetchUser();
        }
    }, [isInitialized, fetchUser]);

    useEffect(() => {
        // Only redirect if we have finished checking the initial state
        if (isInitialized && !isLoading) {
            if (!isAuthenticated) {
                router.push("/login");
            } else if (!user?.is_admin) {
                router.push("/dashboard");
            }
        }
    }, [isInitialized, isLoading, isAuthenticated, user, router]);

    if (!isInitialized || isLoading || !isAuthenticated || !user?.is_admin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                    <p className="text-gray-500 font-medium text-sm">Verifying admin access...</p>
                </div>
            </div>
        );
    }



    const navigation = [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Templates", href: "/admin/templates", icon: FileCode },
        { name: "Global Settings", href: "/admin/settings", icon: Settings },
    ];

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white fixed inset-y-0 left-0">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">Pixo Admin</span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition"
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-800 space-y-2">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
