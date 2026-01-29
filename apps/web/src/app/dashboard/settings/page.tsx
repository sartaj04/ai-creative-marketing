'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Linkedin, Globe, RefreshCw, Loader2, Save, CheckCircle } from 'lucide-react';
import { useProfileStore } from '@/stores/profile-store';
import { useAuthStore } from '@/stores/auth-store';
import { identityApi } from '@/lib/api/identity';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const { currentProfile, triggerIngestion } = useProfileStore();
    const { user } = useAuthStore();
    const { toast } = useToast();

    // Style profile state
    const [styleLoading, setStyleLoading] = useState(false);
    const [styleSaving, setStyleSaving] = useState(false);
    const [retraining, setRetraining] = useState(false);

    // Editable tone sliders
    const [formalCasual, setFormalCasual] = useState(50);
    const [technicalSimple, setTechnicalSimple] = useState(50);
    const [seriousPlayful, setSeriousPlayful] = useState(50);
    const [humbleConfident, setHumbleConfident] = useState(50);
    const [customInstructions, setCustomInstructions] = useState('');

    const loadStyleProfile = useCallback(async () => {
        if (!currentProfile) return;
        setStyleLoading(true);
        try {
            const profile = await identityApi.getStyleProfile(currentProfile.id);
            if (profile.tone_sliders) {
                setFormalCasual(profile.tone_sliders.formal_casual ?? 50);
                setTechnicalSimple(profile.tone_sliders.technical_simple ?? 50);
                setSeriousPlayful(profile.tone_sliders.serious_playful ?? 50);
                setHumbleConfident(profile.tone_sliders.humble_confident ?? 50);
            }
            if (profile.preferred_hooks?.length > 0) {
                setCustomInstructions(profile.preferred_hooks.join(', '));
            }
        } catch {
            // Style profile may not exist yet - that's okay
        } finally {
            setStyleLoading(false);
        }
    }, [currentProfile]);

    useEffect(() => {
        if (activeTab === 'agent') {
            loadStyleProfile();
        }
    }, [activeTab, loadStyleProfile]);

    const handleSaveStyle = async () => {
        if (!currentProfile) return;
        setStyleSaving(true);
        try {
            await identityApi.updateStyleProfile(currentProfile.id, {
                tone_sliders: {
                    formal_casual: formalCasual,
                    technical_simple: technicalSimple,
                    serious_playful: seriousPlayful,
                    humble_confident: humbleConfident,
                },
                preferred_hooks: customInstructions.split(',').map(s => s.trim()).filter(Boolean),
            });
            toast({ title: 'Style profile saved' });
        } catch (error) {
            toast({ title: 'Failed to save style', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setStyleSaving(false);
        }
    };

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
                    <TabsTrigger value="agent" className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 rounded-lg">Agent Persona</TabsTrigger>
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

                <TabsContent value="agent" className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Voice & Tone</CardTitle>
                            <CardDescription>Configure how your agents sound.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {styleLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label>Formal vs Casual</Label>
                                                <span className="text-xs text-slate-400">{formalCasual}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500 w-16">Formal</span>
                                                <Slider
                                                    value={[formalCasual]}
                                                    onValueChange={(v) => setFormalCasual(v[0])}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs text-slate-500 w-16 text-right">Casual</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label>Technical vs Simple</Label>
                                                <span className="text-xs text-slate-400">{technicalSimple}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500 w-16">Technical</span>
                                                <Slider
                                                    value={[technicalSimple]}
                                                    onValueChange={(v) => setTechnicalSimple(v[0])}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs text-slate-500 w-16 text-right">Simple</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label>Serious vs Playful</Label>
                                                <span className="text-xs text-slate-400">{seriousPlayful}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500 w-16">Serious</span>
                                                <Slider
                                                    value={[seriousPlayful]}
                                                    onValueChange={(v) => setSeriousPlayful(v[0])}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs text-slate-500 w-16 text-right">Playful</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label>Humble vs Confident</Label>
                                                <span className="text-xs text-slate-400">{humbleConfident}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500 w-16">Humble</span>
                                                <Slider
                                                    value={[humbleConfident]}
                                                    onValueChange={(v) => setHumbleConfident(v[0])}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs text-slate-500 w-16 text-right">Confident</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Custom Instructions / Preferred Hooks</Label>
                                        <Textarea
                                            value={customInstructions}
                                            onChange={(e) => setCustomInstructions(e.target.value)}
                                            placeholder="e.g. Always use bullet points, avoid corporate jargon, focus on actionable advice."
                                            className="min-h-[100px]"
                                        />
                                        <p className="text-xs text-slate-500">Comma-separated list of preferred hooks or instructions for your agent.</p>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            onClick={handleSaveStyle}
                                            disabled={styleSaving}
                                            className="bg-cyan-600 hover:bg-cyan-500 flex-1"
                                        >
                                            {styleSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Changes
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleRetrain}
                                            disabled={retraining}
                                        >
                                            {retraining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                            Retrain Agent
                                        </Button>
                                    </div>
                                </>
                            )}
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
                </TabsContent>
            </Tabs>
        </div>
    );
}
