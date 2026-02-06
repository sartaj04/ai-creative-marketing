'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Linkedin, Globe, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import { useProfileStore } from '@/stores/profile-store';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const { currentProfile, triggerIngestion } = useProfileStore();
    const router = useRouter();
    const { user } = useAuthStore();
    const { toast } = useToast();
    const [retraining, setRetraining] = useState(false);

    const handleRetrain = async () => {
        if (!currentProfile) return;
        setRetraining(true);
        try {
            await triggerIngestion(currentProfile.id);
            toast({ title: 'Re-ingestion triggered', description: 'Your agent model is being retrained with your latest data.' });
        } catch (error) {
            toast({ title: 'Failed to trigger retraining', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setRetraining(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await authApi.deleteAccount();
            const { logout } = useAuthStore.getState();
            logout();
            toast({ title: 'Account deleted', description: 'Your account has been successfully deleted.' });
            router.push('/');
        } catch (error) {
            toast({ title: 'Failed to delete account', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const source = currentProfile?.sources;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your profile, agent preferences, and account.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 rounded-lg">Profile & Sources</TabsTrigger>
                    <TabsTrigger value="account" className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 rounded-lg">Account</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Content Sources</CardTitle>
                            <CardDescription>Where your agents learn your voice and expertise from.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                        <Linkedin className="w-5 h-5 text-[#0077b5]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">LinkedIn Profile</h3>
                                        {source?.linkedin_url ? (
                                            <p className="text-sm text-slate-500">{source.linkedin_url}</p>
                                        ) : (
                                            <p className="text-sm text-slate-400">Not connected</p>
                                        )}
                                    </div>
                                </div>
                                {source?.linkedin_url && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle className="w-4 h-4" />
                                        Connected
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-cyan-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Personal Website</h3>
                                        {source?.website_url ? (
                                            <p className="text-sm text-slate-500">{source.website_url}</p>
                                        ) : (
                                            <p className="text-sm text-slate-400">Not added</p>
                                        )}
                                    </div>
                                </div>
                                {source?.website_url && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle className="w-4 h-4" />
                                        Connected
                                    </div>
                                )}
                            </div>

                            {source?.last_synced_at && (
                                <p className="text-xs text-slate-400">
                                    Last synced: {new Date(source.last_synced_at).toLocaleDateString()}
                                </p>
                            )}

                            <Button
                                variant="outline"
                                onClick={handleRetrain}
                                disabled={retraining || !currentProfile}
                                className="w-full"
                            >
                                {retraining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                Re-sync Profile Sources
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="account" className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>Your personal details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-slate-500">Name</Label>
                                    <p className="text-sm font-medium text-slate-900">{user?.name || 'Not set'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-500">Email</Label>
                                    <p className="text-sm font-medium text-slate-900">{user?.email || 'Not set'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 bg-red-50/10">
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                            <CardDescription>Irreversible actions for your account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">Delete Account</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your account
                                            and remove your data from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                                            Delete Account
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
