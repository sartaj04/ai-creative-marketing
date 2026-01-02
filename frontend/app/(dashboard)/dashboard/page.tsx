"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    Sparkles,
    ImageIcon,
    TrendingUp,
    Clock,
    ArrowRight,
    Plus,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores/auth-store";

// Demo data for UI
const recentAssets = [
    { id: 1, thumbnail: "/placeholder.jpg", platform: "instagram_feed" },
    { id: 2, thumbnail: "/placeholder.jpg", platform: "facebook" },
    { id: 3, thumbnail: "/placeholder.jpg", platform: "linkedin" },
    { id: 4, thumbnail: "/placeholder.jpg", platform: "instagram_story" },
    { id: 5, thumbnail: "/placeholder.jpg", platform: "twitter" },
    { id: 6, thumbnail: "/placeholder.jpg", platform: "instagram_feed" },
];

const activities = [
    { id: 1, action: "Generated 10 creatives", time: "2 hours ago" },
    { id: 2, action: "Downloaded ZIP archive", time: "5 hours ago" },
    { id: 3, action: "Updated brand profile", time: "1 day ago" },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const usagePercent = ((user?.usage_count || 0) / 200) * 100;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Welcome back!</h1>
                    <p className="text-muted-foreground">
                        Here's what's happening with your creatives
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/generate">
                        <Plus className="h-4 w-4 mr-2" /> New Campaign
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Assets Generated
                            </CardTitle>
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{user?.usage_count || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                This month
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Usage Limit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {user?.tier === "pro" ? "∞" : `${user?.usage_count || 0}/200`}
                            </div>
                            <Progress value={usagePercent} className="mt-2 h-1" />
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">5</div>
                            <p className="text-xs text-muted-foreground">Active campaigns</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
                            <Download className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">127</div>
                            <p className="text-xs text-muted-foreground">All time</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Quick Actions & Recent */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Assets */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Assets</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/assets">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            {recentAssets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="aspect-square rounded-lg bg-muted overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                                >
                                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activities.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                                    <div>
                                        <p className="text-sm">{activity.action}</p>
                                        <p className="text-xs text-muted-foreground flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CTA */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
                    <div>
                        <h3 className="text-lg font-semibold">Create Your Next Campaign</h3>
                        <p className="text-sm text-muted-foreground">
                            Generate stunning creatives for any platform in seconds
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/dashboard/generate">
                            <Sparkles className="h-4 w-4 mr-2" /> Start Generating
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
