'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Linkedin, Globe, RefreshCw, Loader2, CheckCircle, Pencil, Trash2,
    Users, UserMinus, LogOut as LogOutIcon, Mail, ChevronRight,
    Briefcase, GraduationCap, Star, MessageSquarePlus, Upload, FileText,
} from 'lucide-react';
import { useProfileStore } from '@/stores/profile-store';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { membersApi, type Member } from '@/lib/api/members';
import { profilesApi, type Profile } from '@/lib/api/profiles';
import { identityApi, type IdentityGraph, type Timeline, type TimelineEvent } from '@/lib/api/identity';
import { DeepenIdentityModal } from '@/components/identity/DeepenIdentityModal';
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

const AVATAR_COLORS = [
    'bg-cyan-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
];

function getAvatarColor(name: string) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const EventIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'work': return <Briefcase className="w-4 h-4 text-indigo-500" />;
        case 'education': return <GraduationCap className="w-4 h-4 text-emerald-500" />;
        default: return <Star className="w-4 h-4 text-slate-400" />;
    }
};

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
    const { currentProfile, profiles, triggerIngestion, updateProfile, deleteProfile, fetchProfiles } = useProfileStore();
    const router = useRouter();
    const { user } = useAuthStore();
    const { toast } = useToast();

    // Profile tab state
    const [identityGraph, setIdentityGraph] = useState<IdentityGraph | null>(null);
    const [timeline, setTimeline] = useState<Timeline | null>(null);
    const [identityLoading, setIdentityLoading] = useState(false);

    // Sources tab state
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [editingLinkedin, setEditingLinkedin] = useState(false);
    const [editingWebsite, setEditingWebsite] = useState(false);
    const [savingSource, setSavingSource] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [resyncing, setResyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Members tab state
    const [members, setMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [leaving, setLeaving] = useState(false);

    // Account tab state
    const [renameProfile, setRenameProfile] = useState<Profile | null>(null);
    const [renameName, setRenameName] = useState('');
    const [renaming, setRenaming] = useState(false);

    const isOwner = currentProfile?.role !== 'member';
    const source = currentProfile?.sources;

    // ── Fetch identity data ──
    const fetchIdentity = useCallback(async () => {
        if (!currentProfile) return;
        setIdentityLoading(true);
        try {
            const [graph, tl] = await Promise.all([
                identityApi.getIdentityGraph(currentProfile.id).catch(() => null),
                identityApi.getTimeline(currentProfile.id).catch(() => null),
            ]);
            setIdentityGraph(graph);
            setTimeline(tl);
        } catch { }
        finally { setIdentityLoading(false); }
    }, [currentProfile?.id]);

    useEffect(() => {
        if (currentProfile && activeTab === 'profile') fetchIdentity();
    }, [currentProfile?.id, activeTab, fetchIdentity]);

    // ── Fetch members ──
    const fetchMembers = useCallback(async () => {
        if (!currentProfile) return;
        setMembersLoading(true);
        try {
            const res = await membersApi.list(currentProfile.id);
            setMembers(res.members);
        } catch { }
        finally { setMembersLoading(false); }
    }, [currentProfile?.id]);

    useEffect(() => {
        if (currentProfile && activeTab === 'members') fetchMembers();
    }, [currentProfile?.id, activeTab, fetchMembers]);

    // ── Init source edit fields ──
    useEffect(() => {
        setLinkedinUrl(source?.linkedin_url || '');
        setWebsiteUrl(source?.website_url || '');
        setEditingLinkedin(false);
        setEditingWebsite(false);
    }, [source?.linkedin_url, source?.website_url]);

    // ── Handlers ──
    const handleSaveSource = async (field: 'linkedin_url' | 'website_url') => {
        if (!currentProfile) return;
        setSavingSource(true);
        try {
            const data = field === 'linkedin_url'
                ? { linkedin_url: linkedinUrl.trim() }
                : { website_url: websiteUrl.trim() };
            await profilesApi.updateSources(currentProfile.id, data);
            await fetchProfiles();
            toast({ title: 'Source updated', description: 'Your identity will be deepened with the new data.' });
            if (field === 'linkedin_url') setEditingLinkedin(false);
            else setEditingWebsite(false);
        } catch (error) {
            toast({ title: 'Failed to update source', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setSavingSource(false);
        }
    };

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentProfile) return;
        setUploadingResume(true);
        try {
            await profilesApi.uploadResume(currentProfile.id, file);
            await fetchProfiles();
            toast({ title: 'Resume uploaded', description: 'Your identity will be deepened with the new data.' });
        } catch (error) {
            toast({ title: 'Failed to upload resume', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setUploadingResume(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleResync = async () => {
        if (!currentProfile) return;
        setResyncing(true);
        try {
            await triggerIngestion(currentProfile.id);
            toast({ title: 'Re-sync triggered', description: 'Your sources are being re-analyzed.' });
        } catch (error) {
            toast({ title: 'Failed to trigger re-sync', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setResyncing(false);
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

    const handleRename = async () => {
        if (!renameProfile || !renameName.trim()) return;
        setRenaming(true);
        try {
            await updateProfile(renameProfile.id, { name: renameName.trim() });
            toast({ title: 'Profile renamed', description: `Profile renamed to "${renameName.trim()}".` });
            setRenameProfile(null);
        } catch (error) {
            toast({ title: 'Failed to rename profile', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setRenaming(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!currentProfile) return;
        try {
            await deleteProfile(currentProfile.id);
            toast({ title: 'Profile deleted', description: `"${currentProfile.name}" has been deleted.` });
        } catch (error) {
            toast({ title: 'Failed to delete profile', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const handleInvite = async () => {
        if (!currentProfile || !inviteEmail.trim()) return;
        setInviting(true);
        try {
            await membersApi.invite(currentProfile.id, inviteEmail.trim());
            toast({ title: 'Invitation sent', description: `An invitation was sent to ${inviteEmail.trim()}.` });
            setInviteEmail('');
            fetchMembers();
        } catch (error) {
            toast({ title: 'Failed to send invitation', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (member: Member) => {
        if (!currentProfile) return;
        try {
            await membersApi.remove(currentProfile.id, member.id);
            toast({ title: 'Member removed', description: `${member.user_name || member.invited_email} has been removed.` });
            fetchMembers();
        } catch (error) {
            toast({ title: 'Failed to remove member', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const handleLeaveProfile = async () => {
        if (!currentProfile) return;
        setLeaving(true);
        try {
            await membersApi.leave(currentProfile.id);
            await fetchProfiles();
            toast({ title: 'Left profile', description: `You have left "${currentProfile.name}".` });
        } catch (error) {
            toast({ title: 'Failed to leave profile', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setLeaving(false);
        }
    };

    const recentEvents = (timeline?.events || [])
        .sort((a, b) => {
            const da = a.start_date ? new Date(a.start_date).getTime() : 0;
            const db_ = b.start_date ? new Date(b.start_date).getTime() : 0;
            return db_ - da;
        })
        .slice(0, 3);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your identity, sources, team, and account.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 rounded-lg">Profile</TabsTrigger>
                    <TabsTrigger value="sources" className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 rounded-lg">Sources</TabsTrigger>
                    <TabsTrigger value="members" className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 rounded-lg">Members</TabsTrigger>
                    <TabsTrigger value="account" className="data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 rounded-lg">Account</TabsTrigger>
                </TabsList>

                {/* ════════════════════════ PROFILE TAB ════════════════════════ */}
                <TabsContent value="profile" className="space-y-6">
                    {identityLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Identity Summary */}
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle>Identity Overview</CardTitle>
                                    <CardDescription>How Pixo understands your professional brand.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {identityGraph ? (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {identityGraph.current_role && (
                                                    <div className="space-y-1">
                                                        <Label className="text-slate-500 text-xs">Role</Label>
                                                        <p className="text-sm font-medium">{identityGraph.current_role}</p>
                                                    </div>
                                                )}
                                                {identityGraph.industry && (
                                                    <div className="space-y-1">
                                                        <Label className="text-slate-500 text-xs">Industry</Label>
                                                        <p className="text-sm font-medium">{identityGraph.industry}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {identityGraph.bio_summary && (
                                                <div className="space-y-1">
                                                    <Label className="text-slate-500 text-xs">Bio Summary</Label>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{identityGraph.bio_summary}</p>
                                                </div>
                                            )}
                                            {identityGraph.expertise_areas?.length > 0 && (
                                                <div className="space-y-2">
                                                    <Label className="text-slate-500 text-xs">Expertise</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {identityGraph.expertise_areas.map((area) => (
                                                            <Badge key={area} variant="secondary" className="text-xs">{area}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Completeness */}
                                            <div className="flex items-center gap-3 pt-2">
                                                <div className="flex-1">
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
                                                            style={{ width: `${identityGraph.completeness_score ?? 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-sm font-semibold text-cyan-600">{identityGraph.completeness_score ?? 0}%</span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-4">No identity data yet. Complete onboarding or deepen your identity to get started.</p>
                                    )}
                                    <Link href="/identity" className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                                        View Full Identity Universe <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </CardContent>
                            </Card>

                            {/* Timeline Preview */}
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Timeline</CardTitle>
                                            <CardDescription>Your professional journey highlights.</CardDescription>
                                        </div>
                                        <Link href="/dashboard/identity">
                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                View Full Timeline <ChevronRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {recentEvents.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentEvents.map((event) => (
                                                <div key={event.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                                                    <div className="p-1.5 rounded-md bg-white border border-slate-200">
                                                        <EventIcon type={event.event_type} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{event.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {event.start_date ? new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-4">No timeline events yet.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Deepen Identity */}
                            <Card className="border-slate-200 bg-gradient-to-br from-cyan-50/30 to-white">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shrink-0">
                                            <MessageSquarePlus className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 mb-1">Deepen Your Identity</h3>
                                            <p className="text-sm text-slate-600 mb-4">
                                                Share more stories, experiences, and opinions with Pixo. The more context you provide, the better your AI-generated content will match your authentic voice.
                                            </p>
                                            <DeepenIdentityModal onComplete={() => { fetchIdentity(); toast({ title: 'Identity updated', description: 'Your new stories have been added.' }); }} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* ════════════════════════ SOURCES TAB ════════════════════════ */}
                <TabsContent value="sources" className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Content Sources</CardTitle>
                            <CardDescription>Where Pixo learns your voice and expertise from. Adding new sources deepens your identity without overwriting existing data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* LinkedIn */}
                            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                            <Linkedin className="w-5 h-5 text-[#0077b5]" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 text-sm">LinkedIn Profile</h3>
                                            {source?.linkedin_url && !editingLinkedin ? (
                                                <p className="text-xs text-slate-500 truncate max-w-xs">{source.linkedin_url}</p>
                                            ) : (
                                                <p className="text-xs text-slate-400">{source?.linkedin_url ? 'Update your LinkedIn URL' : 'Not connected'}</p>
                                            )}
                                        </div>
                                    </div>
                                    {source?.linkedin_url && !editingLinkedin ? (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs gap-1">
                                                <CheckCircle className="w-3 h-3" /> Connected
                                            </Badge>
                                            <Button variant="ghost" size="sm" onClick={() => setEditingLinkedin(true)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                                {(editingLinkedin || !source?.linkedin_url) && (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="https://linkedin.com/in/yourname"
                                            value={linkedinUrl}
                                            onChange={(e) => setLinkedinUrl(e.target.value)}
                                            className="flex-1 text-sm"
                                        />
                                        <Button size="sm" disabled={savingSource || !linkedinUrl.trim()} onClick={() => handleSaveSource('linkedin_url')}>
                                            {savingSource && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                                            Save
                                        </Button>
                                        {editingLinkedin && (
                                            <Button size="sm" variant="ghost" onClick={() => { setEditingLinkedin(false); setLinkedinUrl(source?.linkedin_url || ''); }}>
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Website */}
                            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                            <Globe className="w-5 h-5 text-cyan-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 text-sm">Personal Website</h3>
                                            {source?.website_url && !editingWebsite ? (
                                                <p className="text-xs text-slate-500 truncate max-w-xs">{source.website_url}</p>
                                            ) : (
                                                <p className="text-xs text-slate-400">{source?.website_url ? 'Update your website URL' : 'Not added'}</p>
                                            )}
                                        </div>
                                    </div>
                                    {source?.website_url && !editingWebsite ? (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs gap-1">
                                                <CheckCircle className="w-3 h-3" /> Connected
                                            </Badge>
                                            <Button variant="ghost" size="sm" onClick={() => setEditingWebsite(true)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                                {(editingWebsite || !source?.website_url) && (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="https://yourwebsite.com"
                                            value={websiteUrl}
                                            onChange={(e) => setWebsiteUrl(e.target.value)}
                                            className="flex-1 text-sm"
                                        />
                                        <Button size="sm" disabled={savingSource || !websiteUrl.trim()} onClick={() => handleSaveSource('website_url')}>
                                            {savingSource && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                                            Save
                                        </Button>
                                        {editingWebsite && (
                                            <Button size="sm" variant="ghost" onClick={() => { setEditingWebsite(false); setWebsiteUrl(source?.website_url || ''); }}>
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Resume */}
                            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 text-sm">Resume / CV</h3>
                                            {source?.resume_path ? (
                                                <p className="text-xs text-slate-500">{source.resume_path.replace('uploaded:', '')}</p>
                                            ) : (
                                                <p className="text-xs text-slate-400">Not uploaded</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {source?.resume_path && (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs gap-1">
                                                <CheckCircle className="w-3 h-3" /> Uploaded
                                            </Badge>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={uploadingResume}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {uploadingResume ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                                            {source?.resume_path ? 'Re-upload' : 'Upload'}
                                        </Button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.docx"
                                            className="hidden"
                                            onChange={handleResumeUpload}
                                        />
                                    </div>
                                </div>
                            </div>

                            {source?.last_synced_at && (
                                <p className="text-xs text-slate-400">
                                    Last synced: {new Date(source.last_synced_at).toLocaleDateString()}
                                </p>
                            )}

                            <Button
                                variant="outline"
                                onClick={handleResync}
                                disabled={resyncing || !currentProfile}
                                className="w-full"
                            >
                                {resyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                Re-sync All Sources
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ════════════════════════ MEMBERS TAB ════════════════════════ */}
                <TabsContent value="members" className="space-y-6">
                    {isOwner && (
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="w-5 h-5" />
                                    Invite a Member
                                </CardTitle>
                                <CardDescription>Add someone to collaborate on &quot;{currentProfile?.name}&quot;.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleInvite(); }}
                                    className="flex items-center gap-3"
                                >
                                    <Input
                                        type="email"
                                        placeholder="colleague@example.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                                        {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Invite
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Members
                            </CardTitle>
                            <CardDescription>People with access to &quot;{currentProfile?.name}&quot;.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {membersLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : members.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No members found.</p>
                            ) : (
                                members.map((member) => (
                                    <div key={member.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                                        <div className={`w-9 h-9 rounded-full ${getAvatarColor(member.user_name || member.invited_email || '?')} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
                                            {(member.user_name || member.invited_email || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium truncate">
                                                    {member.user_name || member.invited_email || 'Unknown'}
                                                </p>
                                                <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                                                    {member.role}
                                                </Badge>
                                                {member.status === 'pending' && (
                                                    <Badge variant="outline" className="text-[10px]">Pending</Badge>
                                                )}
                                            </div>
                                            {member.user_email && member.user_name && (
                                                <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                                            )}
                                        </div>
                                        {isOwner && member.role !== 'owner' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" title="Remove member">
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remove member?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {member.user_name || member.invited_email} will lose access to &quot;{currentProfile?.name}&quot;.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveMember(member)} className="bg-red-600 hover:bg-red-700">
                                                            Remove
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {!isOwner && currentProfile && (
                        <Card className="border-red-100 bg-red-50/10">
                            <CardContent className="flex items-center justify-between p-4">
                                <div>
                                    <p className="text-sm font-medium text-red-600">Leave this profile</p>
                                    <p className="text-xs text-muted-foreground">You will lose access to &quot;{currentProfile.name}&quot;.</p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" disabled={leaving}>
                                            {leaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                                            <LogOutIcon className="w-3.5 h-3.5 mr-1.5" />
                                            Leave
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Leave &quot;{currentProfile.name}&quot;?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                You will lose access to this profile and all its content. You&apos;ll need to be re-invited to rejoin.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleLeaveProfile} className="bg-red-600 hover:bg-red-700">
                                                Leave Profile
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ════════════════════════ ACCOUNT TAB ════════════════════════ */}
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

                    {/* Current Profile Management */}
                    {currentProfile && (
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle>Current Profile</CardTitle>
                                <CardDescription>Manage &quot;{currentProfile.name}&quot;.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(currentProfile.name)} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                                        {currentProfile.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{currentProfile.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{currentProfile.type} &middot; {currentProfile.role || 'owner'}</p>
                                    </div>
                                    {isOwner && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => { setRenameProfile(currentProfile); setRenameName(currentProfile.name); }}
                                        >
                                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                            Rename
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-red-100 bg-red-50/10">
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                            <CardDescription>Irreversible actions.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isOwner && currentProfile && profiles.filter(p => p.role === 'owner').length > 1 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full text-destructive border-red-200 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Profile &quot;{currentProfile.name}&quot;
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete &quot;{currentProfile.name}&quot;?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete this profile and all its content, drafts, and identity data. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteProfile} className="bg-red-600 hover:bg-red-700">
                                                Delete Profile
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full">Delete Account</Button>
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

            {/* Rename Profile Dialog */}
            <Dialog open={!!renameProfile} onOpenChange={(open) => { if (!open) setRenameProfile(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Rename profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="rename-input">Profile name</Label>
                        <Input
                            id="rename-input"
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameProfile(null)} disabled={renaming}>Cancel</Button>
                        <Button onClick={handleRename} disabled={renaming || !renameName.trim()}>
                            {renaming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
