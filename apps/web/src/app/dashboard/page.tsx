'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Sparkles, 
    TrendingUp, 
    Zap, 
    FileText, 
    ArrowRight, 
    CheckCircle2,
    User,
    Briefcase,
    Heart,
    MessageSquare,
    Target
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
            <motion.div variants={itemVariants} className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Welcome back, {user?.name?.split(' ')[0] || 'there'}!
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Here's what's happening with your personal brand today.
                    </p>
                </div>
                <Link href="/dashboard/drafts">
                    <Button className="bg-primary hover:bg-primary/90 shadow-md">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Content
                    </Button>
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
                                <p className="text-2xl font-bold text-slate-900">0</p>
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
                                <p className="text-2xl font-bold text-slate-900">0</p>
                                <p className="text-sm text-slate-500">Posts Generated</p>
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
                                <p className="text-2xl font-bold text-slate-900">--</p>
                                <p className="text-sm text-slate-500">Engagement Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Identity Overview */}
            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Brand Identity</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Professional Identity */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Professional Background</CardTitle>
                                    <CardDescription>Your career and expertise</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">
                                Your professional identity has been captured from your onboarding. 
                                Visit settings to view and edit your expertise areas, career highlights, and target audience.
                            </p>
                            <Link href="/dashboard/settings">
                                <Button variant="link" className="px-0 mt-2 text-primary">
                                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Personal Interests */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                                    <Heart className="w-5 h-5 text-pink-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Interests & Personality</CardTitle>
                                    <CardDescription>What makes you unique</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">
                                Your personal interests and aspirations help us create authentic content 
                                that resonates with your audience and reflects your true personality.
                            </p>
                            <Link href="/dashboard/settings">
                                <Button variant="link" className="px-0 mt-2 text-primary">
                                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Voice Profile */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Voice & Tone</CardTitle>
                                    <CardDescription>How you communicate</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">
                                Based on your voice selection, we've calibrated your content style. 
                                Your preferred hooks include conversational, storytelling, and inspirational approaches.
                            </p>
                            <Link href="/dashboard/settings">
                                <Button variant="link" className="px-0 mt-2 text-primary">
                                    Adjust Voice <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Quick Actions</CardTitle>
                                    <CardDescription>Get started with content</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/dashboard/drafts" className="block">
                                <Button variant="outline" className="w-full justify-start h-10 hover:bg-white">
                                    <FileText className="w-4 h-4 mr-3 text-slate-500" />
                                    Create a new draft
                                </Button>
                            </Link>
                            <Link href="/dashboard/inbox" className="block">
                                <Button variant="outline" className="w-full justify-start h-10 hover:bg-white">
                                    <Zap className="w-4 h-4 mr-3 text-slate-500" />
                                    Review AI suggestions
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </motion.div>
    );
}
