"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    User,
    Mail,
    Lock,
    CreditCard,
    Key,
    Bell,
    Users,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function SettingsPage() {
    const { user } = useAuthStore();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const handlePasswordChange = () => {
        toast.success("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
    };

    const usagePercent = user?.tier === "pro" ? 0 : ((user?.usage_count || 0) / 200) * 100;

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account and preferences
                </p>
            </div>

            <Tabs defaultValue="account">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="account">
                        <User className="h-4 w-4 mr-2" /> Account
                    </TabsTrigger>
                    <TabsTrigger value="billing">
                        <CreditCard className="h-4 w-4 mr-2" /> Billing
                    </TabsTrigger>
                    <TabsTrigger value="api">
                        <Key className="h-4 w-4 mr-2" /> API
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell className="h-4 w-4 mr-2" /> Notifications
                    </TabsTrigger>
                </TabsList>

                {/* Account Tab */}
                <TabsContent value="account" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription>Your account information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{user?.email}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Plan</Label>
                                <div className="flex items-center gap-2">
                                    <span className="capitalize font-medium">{user?.tier}</span>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        Current Plan
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <Button onClick={handlePasswordChange}>Update Password</Button>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>
                                Permanently delete your account and all data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="space-y-6 mt-6" id="billing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Plan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold capitalize">{user?.tier}</h3>
                                    <p className="text-muted-foreground">
                                        {user?.tier === "free"
                                            ? "10 generations/month"
                                            : user?.tier === "starter"
                                                ? "200 generations/month"
                                                : "Unlimited generations"}
                                    </p>
                                </div>
                                <Button>Upgrade Plan</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Usage This Month</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Generations used
                                </span>
                                <span className="font-medium">
                                    {user?.usage_count || 0} /{" "}
                                    {user?.tier === "pro" ? "∞" : "200"}
                                </span>
                            </div>
                            <Progress value={usagePercent} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API Tab */}
                <TabsContent value="api" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>API Key</CardTitle>
                            <CardDescription>
                                {user?.tier === "pro"
                                    ? "Use your API key to integrate BrandScale with your apps"
                                    : "Upgrade to Pro to access the API"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {user?.tier === "pro" ? (
                                <>
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            value="sk_live_xxxxxxxxxxxxxxxxxxxx"
                                            readOnly
                                            className="font-mono"
                                        />
                                        <Button variant="outline">Copy</Button>
                                        <Button variant="outline">Regenerate</Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Keep this secret. Don't share it publicly.
                                    </p>
                                </>
                            ) : (
                                <Button>Upgrade to Pro</Button>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Notifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { id: "generation", label: "Generation complete", default: true },
                                { id: "tips", label: "Weekly tips & updates", default: true },
                                { id: "promo", label: "Promotional offers", default: false },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <Label htmlFor={item.id}>{item.label}</Label>
                                    <input
                                        type="checkbox"
                                        id={item.id}
                                        defaultChecked={item.default}
                                        className="h-4 w-4 accent-primary"
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
