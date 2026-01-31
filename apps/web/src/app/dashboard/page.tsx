'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    TrendingUp,
    Zap,
    FileText,
    CheckCircle2,
    MessageSquare,
    Target,
    Sparkles,
    X,
    ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { onboardingApi } from '@/lib/api/onboarding';
import { draftsApi } from '@/lib/api/drafts';
import { analyticsApi, AnalyticsSummary } from '@/lib/api/analytics';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import Link from 'next/link';

interface DashboardData {
    completeness_score: number;
    is_complete: boolean;
    has_extraction: boolean;
    extracted_sources: string[];
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { currentProfile } = useProfileStore();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [inboxCount, setInboxCount] = useState<number>(0);
    const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const status = await onboardingApi.getStatus();
                setDashboardData(status);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!currentProfile) return;
        const fetchStats = async () => {
            const results = await Promise.allSettled([
                draftsApi.list({ profile_id: currentProfile.id, status: 'inbox', limit: 1 }),
                analyticsApi.getSummary(currentProfile.id, '30d'),
            ]);
            if (results[0].status === 'fulfilled') {
                setInboxCount(results[0].value.total);
            }
            if (results[1].status === 'fulfilled') {
                setAnalyticsSummary(results[1].value);
            }
        };
        fetchStats();
    }, [currentProfile?.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Welcome Section */}
            <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Welcome back, {user?.name?.split(' ')[0] || 'there'}!
                </h1>
                <p className="text-slate-500 mt-1">
                    Here's what's happening with your personal brand today.
                </p>
            </motion.div>

            {/* Identity Universe Banner */}
            <motion.div variants={itemVariants}>
                <Link href="/identity">
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400 p-4 cursor-pointer group hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                        </div>

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">
                                        Your Content DNA is ready — discover your unique style
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-white/90 text-sm font-medium group-hover:text-white transition-colors flex items-center gap-1">
                                    View
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>

            {/* Profile Completeness */}
            {dashboardData && (
                <motion.div variants={itemVariants}>
                    <Card className="border-slate-200 overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                        <Target className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Profile Completeness</h3>
                                        <p className="text-sm text-slate-500">
                                            {dashboardData.is_complete
                                                ? 'Your profile is ready for content generation!'
                                                : 'Complete your profile to unlock all features'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-emerald-600">
                                        {dashboardData.completeness_score}%
                                    </span>
                                </div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${dashboardData.completeness_score}%` }}
                                />
                            </div>
                            {dashboardData.has_extraction && (
                                <div className="flex items-center gap-2 mt-4 text-sm text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Profile imported from {dashboardData.extracted_sources.join(', ')}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Quick Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{inboxCount}</p>
                                <p className="text-sm text-slate-500">Drafts in Pipeline</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{analyticsSummary?.total_drafts_generated ?? 0}</p>
                                <p className="text-sm text-slate-500">Drafts Generated</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {analyticsSummary ? `${(analyticsSummary.approval_rate * 100).toFixed(0)}%` : '--'}
                                </p>
                                <p className="text-sm text-slate-500">Approval Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/inbox" className="block">
                        <Card className="border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Review Inbox</p>
                                    <p className="text-sm text-slate-500">Approve or reject AI drafts</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/dashboard/drafts" className="block">
                        <Card className="border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Content Pipeline</p>
                                    <p className="text-sm text-slate-500">Manage drafts by status</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/dashboard/settings" className="block">
                        <Card className="border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Agent Settings</p>
                                    <p className="text-sm text-slate-500">Adjust voice and tone</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </motion.div>
        </motion.div>
    );
}
