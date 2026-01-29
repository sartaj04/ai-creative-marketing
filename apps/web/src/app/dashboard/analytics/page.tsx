'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    TrendingUp,
    FileText,
    CheckCircle,
    XCircle,
    Activity,
    Loader2,
} from 'lucide-react';
import { analyticsApi, AnalyticsSummary, TopicAnalytics, FormatAnalytics } from '@/lib/api/analytics';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';

type Period = '7d' | '30d' | '90d';

function periodLabel(p: Period): string {
    if (p === '7d') return '7 days';
    if (p === '30d') return '30 days';
    return '90 days';
}

const FORMAT_COLORS: Record<string, string> = {
    post: 'bg-blue-600',
    thread: 'bg-sky-500',
    carousel: 'bg-purple-500',
    article: 'bg-orange-500',
};

export default function AnalyticsPage() {
    const { currentProfile } = useProfileStore();
    const { toast } = useToast();
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [topics, setTopics] = useState<TopicAnalytics | null>(null);
    const [formats, setFormats] = useState<FormatAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('30d');

    const loadAnalytics = useCallback(async () => {
        if (!currentProfile) return;
        setIsLoading(true);
        try {
            const [summaryRes, topicsRes, formatsRes] = await Promise.all([
                analyticsApi.getSummary(currentProfile.id, period),
                analyticsApi.getTopics(currentProfile.id, period),
                analyticsApi.getFormats(currentProfile.id, period),
            ]);
            setSummary(summaryRes);
            setTopics(topicsRes);
            setFormats(formatsRes);
        } catch (error) {
            toast({ title: 'Failed to load analytics', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [currentProfile, period, toast]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    if (isLoading) {
        return (
            <div className="p-8 h-full flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
            </div>
        );
    }

    if (!summary || summary.total_drafts_generated === 0) {
        return (
            <div className="p-8 h-full bg-slate-50 min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                        <Activity className="w-10 h-10 text-slate-300" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">No analytics data yet</h2>
                    <p className="text-slate-500">
                        Start by reviewing drafts in your inbox. Analytics will populate as you approve, reject, and publish content.
                    </p>
                </div>
            </div>
        );
    }

    const topicsList = topics?.topics ?? [];
    const formatsList = formats?.formats ?? [];
    const maxTopicCount = topicsList.length > 0 ? Math.max(...topicsList.map(t => t.count)) : 1;
    const totalFormatCount = formatsList.reduce((sum, f) => sum + f.count, 0) || 1;
    const topFormat = formatsList.length > 0 ? formatsList[0] : null;

    return (
        <div className="p-8 h-full bg-slate-50 min-h-screen space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Content Analytics</h1>
                    <p className="text-slate-500">Track your content performance and agent accuracy.</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                    {(['7d', '30d', '90d'] as Period[]).map(p => (
                        <Button
                            key={p}
                            variant={period === p ? 'default' : 'ghost'}
                            size="sm"
                            className={`h-8 px-3 text-xs ${period === p ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'text-slate-600'}`}
                            onClick={() => setPeriod(p)}
                        >
                            {p}
                        </Button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Drafts Generated</CardTitle>
                        <FileText className="h-4 w-4 text-cyan-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{summary.total_drafts_generated}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            in the last {periodLabel(period)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Drafts Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{summary.drafts_approved}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {summary.drafts_published} published
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Drafts Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{summary.drafts_rejected}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {summary.drafts_rejected === 0 ? 'Great track record!' : `${summary.drafts_rejected} not matching`}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-cyan-100 bg-cyan-50/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-bl-full -mr-4 -mt-4" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-cyan-900">Approval Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-cyan-600" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-cyan-900">{(summary.approval_rate * 100).toFixed(1)}%</div>
                        <p className="text-xs text-cyan-700 font-medium mt-1">
                            Avg confidence: {summary.avg_confidence.toFixed(0)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Topic Distribution */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Top Topics</CardTitle>
                        <CardDescription>Most generated topics in the last {periodLabel(period)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        {topicsList.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
                                No topic data yet
                            </div>
                        ) : (
                            <>
                                <div className="h-[300px] w-full flex items-end justify-between gap-2 px-4 pb-4 border-b border-l border-slate-100 relative">
                                    {topicsList.map((topic, i) => {
                                        const heightPercent = (topic.count / maxTopicCount) * 100;
                                        return (
                                            <div
                                                key={i}
                                                className="group relative flex-1 bg-slate-100 hover:bg-cyan-500 transition-colors rounded-t-sm"
                                                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                    {topic.count} drafts &bull; {(topic.approval_rate * 100).toFixed(0)}% approved
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-4 gap-1">
                                    {topicsList.map((topic, i) => (
                                        <span key={i} className="flex-1 text-center truncate">{topic.topic}</span>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Format Distribution */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Content Formats</CardTitle>
                        <CardDescription>Distribution by format type</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {formatsList.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-sm">No format data yet</div>
                        ) : (
                            <>
                                {formatsList.map((fmt) => {
                                    const pct = (fmt.count / totalFormatCount) * 100;
                                    const color = FORMAT_COLORS[fmt.format] || 'bg-slate-500';
                                    return (
                                        <div key={fmt.format} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${color}`} />
                                                    <span className="capitalize">{fmt.format}</span>
                                                </span>
                                                <span className="font-bold">{fmt.count}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <p className="text-[10px] text-slate-400">
                                                {(fmt.approval_rate * 100).toFixed(0)}% approval rate
                                            </p>
                                        </div>
                                    );
                                })}

                                <div className="pt-6 border-t border-slate-100">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="w-4 h-4 text-cyan-600" />
                                            <h4 className="font-semibold text-sm">Insight</h4>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {topFormat
                                                ? `Your most popular format is "${topFormat.format}" with ${topFormat.count} drafts and ${(topFormat.approval_rate * 100).toFixed(0)}% approval rate.`
                                                : 'Generate more content to see insights.'}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
