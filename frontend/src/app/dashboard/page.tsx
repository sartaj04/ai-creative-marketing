"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { brandsApi, assetsApi, usersApi } from "@/lib/api";
import {
    Sparkles,
    Image,
    TrendingUp,
    Plus,
    ArrowRight,
    Palette,
} from "lucide-react";

interface DashboardStats {
    total_assets: number;
    usage_count: number;
    usage_limit: number;
    brands_count: number;
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentAssets, setRecentAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [usageRes, assetsRes, brandsRes] = await Promise.all([
                    usersApi.getUsage(),
                    assetsApi.list({ limit: 4 } as any),
                    brandsApi.list(),
                ]);

                setStats({
                    total_assets: usageRes.data.total_assets || 0,
                    usage_count: usageRes.data.usage_count || 0,
                    usage_limit: usageRes.data.usage_limit || 10,
                    brands_count: brandsRes.data?.length || 0,
                });
                setRecentAssets(assetsRes.data?.slice(0, 4) || []);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}!
                </h1>
                <p className="text-gray-600 mt-1">
                    Here&apos;s what&apos;s happening with your creative campaigns.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-primary-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Generations</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats?.usage_count || 0}
                                <span className="text-sm font-normal text-gray-400">
                                    /{stats?.usage_limit === -1 ? "∞" : stats?.usage_limit}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Image className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Assets</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.total_assets || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Palette className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Brand Profiles</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.brands_count || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Plan</p>
                            <p className="text-2xl font-bold text-gray-900 capitalize">{user?.tier || "Free"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Link
                    href="/dashboard/generate"
                    className="group bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white hover:shadow-lg transition"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Create New Ad</h3>
                            <p className="text-primary-100">
                                Generate marketing creatives with AI
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
                            <Plus className="w-6 h-6" />
                        </div>
                    </div>
                </Link>

                <Link
                    href="/dashboard/brands/new"
                    className="group bg-white rounded-xl p-6 border-2 border-dashed border-gray-200 hover:border-primary-500 transition"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Brand Profile</h3>
                            <p className="text-gray-600">
                                Paste your website URL to get started
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary-100 transition">
                            <Palette className="w-6 h-6 text-gray-400 group-hover:text-primary-500" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Recent Assets */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Assets</h2>
                    <Link
                        href="/dashboard/assets"
                        className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                    >
                        View all
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {recentAssets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
                        {recentAssets.map((asset) => (
                            <div
                                key={asset.id}
                                className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                            >
                                {asset.thumbnail_url ? (
                                    <img
                                        src={asset.thumbnail_url}
                                        alt="Asset"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Image className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No assets generated yet</p>
                        <Link
                            href="/dashboard/generate"
                            className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600"
                        >
                            <Sparkles className="w-4 h-4" />
                            Generate your first ad
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
