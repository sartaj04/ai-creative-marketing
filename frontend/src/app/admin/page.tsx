"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { FileCode, Users, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AdminDashboard() {
    const [statsData, setStatsData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get("/admin/dashboard/stats/");
                setStatsData(response.data);
            } catch (error) {
                console.error("Failed to fetch admin stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const stats = [
        {
            name: "Total Templates",
            value: isLoading ? "..." : statsData?.total_templates?.toString() || "0",
            icon: FileCode,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            name: "Pending Approval",
            value: isLoading ? "..." : statsData?.pending_approval?.toString() || "0",
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50"
        },
        {
            name: "Approved",
            value: isLoading ? "..." : statsData?.approved_templates?.toString() || "0",
            icon: CheckCircle,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
        {
            name: "Total Users",
            value: isLoading ? "..." : statsData?.total_users?.toString() || "0",
            icon: Users,
            color: "text-violet-600",
            bg: "bg-violet-50"
        },
    ];

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
                    <p className="text-gray-500 mt-2">Manage your creative templates and system validation.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                </div>
                                <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Link
                                href="/admin/templates?action=create"
                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition group"
                            >
                                <div className="p-2 bg-gray-50 group-hover:bg-primary-100 rounded-md">
                                    <FileCode className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                                </div>
                                <span className="font-medium text-gray-700">New Template</span>
                            </Link>
                            <Link
                                href="/admin/templates?status=DRAFT"
                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-amber-500 hover:bg-amber-50 transition group"
                            >
                                <div className="p-2 bg-gray-50 group-hover:bg-amber-100 rounded-md">
                                    <Clock className="w-5 h-5 text-gray-600 group-hover:text-amber-600" />
                                </div>
                                <span className="font-medium text-gray-700">Review Drafts</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">System Status</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">S3 Connection</span>
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {isLoading ? "Checking..." : statsData?.system_status?.s3_connection || "Active"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Playwright Renderer</span>
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {isLoading ? "Checking..." : statsData?.system_status?.playwright_renderer || "Healthy"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Normalization AI</span>
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {isLoading ? "Checking..." : statsData?.system_status?.normalization_ai || "Operational"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
