'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Linkedin, Globe, RefreshCw, Loader2, CheckCircle, Pencil, Upload, FileText } from 'lucide-react';
import { useProfileStore } from '@/stores/profile-store';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/client';
import { profilesApi } from '@/lib/api/profiles';

export function ManageSourcesModal() {
    const [open, setOpen] = useState(false);
    const { currentProfile, triggerIngestion, fetchProfiles } = useProfileStore();
    const { toast } = useToast();

    const source = currentProfile?.sources;

    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [editingLinkedin, setEditingLinkedin] = useState(false);
    const [editingWebsite, setEditingWebsite] = useState(false);
    const [savingSource, setSavingSource] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [resyncing, setResyncing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setLinkedinUrl(source?.linkedin_url || '');
            setWebsiteUrl(source?.website_url || '');
            setEditingLinkedin(false);
            setEditingWebsite(false);
        }
    }, [open, source?.linkedin_url, source?.website_url]);

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


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="default">
                    Manage Sources
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Manage Content Sources</DialogTitle>
                    <DialogDescription>
                        Where Pixo learns your voice and expertise from. Adding new sources deepens your identity without overwriting existing data.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-6 pt-0 space-y-5">
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
