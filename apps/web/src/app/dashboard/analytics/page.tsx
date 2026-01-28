'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpRight, TrendingUp, Users, Eye, MousePointerClick, Activity, Share2, ArrowDownRight } from 'lucide-react';

export default function AnalyticsPage() {
    return (
        <div className="p-8 h-full bg-slate-50 min-h-screen space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Authority Analytics</h1>
                    <p className="text-slate-500">Track your reputation growth across channels.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live Data
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Impressions</CardTitle>
                        <Eye className="h-4 w-4 text-cyan-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">45.2K</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-medium">+20.1%</span> from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Profile Visits</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">2,350</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-medium">+180.1%</span> from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Engagement Rate</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">4.3%</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <ArrowDownRight className="w-3 h-3 text-red-500" />
                            <span className="text-red-500 font-medium">-2.1%</span> from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-cyan-100 bg-cyan-50/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-bl-full -mr-4 -mt-4" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-cyan-900">Authority Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-cyan-600" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-cyan-900">78/100</div>
                        <p className="text-xs text-cyan-700 font-medium mt-1">
                            Top 5% of your industry
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Chart Placeholder Area */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Growth Trend</CardTitle>
                        <CardDescription>Audience growth over the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full flex items-end justify-between gap-2 px-4 pb-4 border-b border-l border-slate-100 relative">
                            {/* Mock Bar Chart */}
                            {[35, 45, 30, 60, 75, 50, 65, 80, 70, 90, 85, 95].map((h, i) => (
                                <div key={i} className="group relative flex-1 bg-slate-100 hover:bg-cyan-500 transition-colors rounded-t-sm" style={{ height: `${h}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {h * 10}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 mt-2 px-4">
                            <span>Day 1</span>
                            <span>Day 15</span>
                            <span>Day 30</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Top Channels</CardTitle>
                        <CardDescription>Where your authority is strongest</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600" /> LinkedIn</span>
                                <span className="font-bold">65%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-sky-500" /> Twitter</span>
                                <span className="font-bold">25%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-sky-500 rounded-full" style={{ width: '25%' }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500" /> Blog / SEO</span>
                                <span className="font-bold">10%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 rounded-full" style={{ width: '10%' }} />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="w-4 h-4 text-cyan-600" />
                                    <h4 className="font-semibold text-sm">Insight</h4>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Your LinkedIn engagement is driving 80% of your authority score. Consider repurposing top posts to Twitter.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
