'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Bell, Linkedin, Globe, Mic2, Sparkles, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');

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
                                        <p className="text-sm text-slate-500">Connected as Sartaj Syed</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">Disconnect</Button>
                            </div>

                            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-cyan-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Personal Website</h3>
                                        <p className="text-sm text-slate-500">https://sartaj.dev</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">Update</Button>
                            </div>

                            <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-cyan-300 hover:bg-cyan-50/10 cursor-pointer transition-all">
                                <div className="text-center space-y-2">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <p className="font-medium text-slate-900">Add New Source</p>
                                    <p className="text-sm text-slate-500">Connect Medium, Substack, or upload PDFs</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="agent" className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Voice & Tone</CardTitle>
                            <CardDescription>Configure how your agents sound.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label>Base Personality</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['Professional', 'Casual', 'Bold', 'Academic'].map((style) => (
                                        <div key={style} className={`p-4 border rounded-lg cursor-pointer transition-all ${style === 'Professional' ? 'border-cyan-500 bg-cyan-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                                            <div className="font-semibold">{style}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Custom Instructions</Label>
                                <Textarea
                                    placeholder="e.g. Always use bullet points, avoid corporate jargon, focus on actionable advice."
                                    className="min-h-[100px]"
                                />
                                <p className="text-xs text-slate-500">These instructions will be applied to all generated drafts.</p>
                            </div>

                            <Button className="w-full bg-cyan-600 hover:bg-cyan-500">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Retrain Agent Model
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="account" className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>Update your personal details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input defaultValue="Sartaj" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input defaultValue="Syed" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input defaultValue="sartaj@example.com" disabled />
                            </div>
                            <Button variant="outline" className="mt-4">Change Password</Button>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 bg-red-50/30">
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                            <CardDescription className="text-red-400">Irreversible actions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive">Delete Account</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
