'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    FileText,
    Sparkles,
    ChevronRight,
    Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { onboardingApi } from '@/lib/api/onboarding';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

interface DashboardData {
    completeness_score: number;
    is_complete: boolean;
    has_extraction: boolean;
    extracted_sources: string[];
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

            {/* Content DNA & Completeness Combined */}
            {dashboardData && (
                <motion.div variants={itemVariants}>
                    <Link href="/identity">
                        <Card className="border-slate-200 overflow-hidden cursor-pointer group hover:shadow-lg hover:border-cyan-300 transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 flex-shrink-0">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 mb-1">Your Content DNA</h3>
                                            <p className="text-sm text-slate-600 mb-3">
                                                {dashboardData.completeness_score < 100
                                                    ? `The more complete your profile, the better AI can match your unique voice and style.`
                                                    : 'Your profile is complete! AI can now generate content that perfectly matches your unique voice and style.'}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${dashboardData.completeness_score}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-2xl font-bold text-cyan-600 whitespace-nowrap">
                                                    {dashboardData.completeness_score}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/generate" className="block">
                        <Card className="border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Generate Content</p>
                                    <p className="text-sm text-slate-500">Create new AI-powered drafts</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/dashboard/inbox" className="block">
                        <Card className="border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-cyan-600" />
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
                </div>
            </motion.div>
        </motion.div>
    );
}
