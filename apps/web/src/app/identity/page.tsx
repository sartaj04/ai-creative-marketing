'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle, Check, X, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfileStore } from '@/stores/profile-store';
import { identityApi, IdentityUniverse, RegenerationPreview, Timeline } from '@/lib/api/identity';
import IdentityComposition from '@/components/identity-universe/IdentityComposition';
import PersonalizeAgentCard from '@/components/dashboard/PersonalizeAgentCard';
import { IdentityLoader } from '@/components/identity-universe/IdentityLoader';
import { profilesApi } from '@/lib/api/profiles';
import { getFieldByKey } from '@/lib/schemas/identity-schema';
import { PixoChatDialog } from '@/components/identity-universe/PixoChatDialog';
import { User } from 'lucide-react';

export default function IdentityUniversePage() {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const [universe, setUniverse] = useState<IdentityUniverse | null>(null);
    const [timeline, setTimeline] = useState<Timeline | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState(false);
    const [regenerationPreview, setRegenerationPreview] = useState<RegenerationPreview | null>(null);
    const [pixoChatOpen, setPixoChatOpen] = useState(false);

    const loadUniverse = useCallback(async () => {
        if (!currentProfile?.id) return;

        try {
            setLoading(true);
            setError(null);
            const [data, timelineData] = await Promise.all([
                identityApi.getIdentityUniverse(currentProfile.id),
                identityApi.getTimeline(currentProfile.id).catch(() => null),
            ]);
            setUniverse(data);
            setTimeline(timelineData);
        } catch (err) {
            console.error('Failed to load identity universe:', err);
            setError('Failed to load your identity data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [currentProfile?.id]);

    useEffect(() => {
        loadUniverse();
    }, [loadUniverse]);

    const handleRegenerate = async () => {
        if (!currentProfile?.id) return;

        try {
            setRegenerating(true);
            const preview = await identityApi.previewRegeneration(currentProfile.id, {
                scope: 'full',
            });
            setRegenerationPreview(preview);
        } catch (err) {
            console.error('Failed to generate preview:', err);
        } finally {
            setRegenerating(false);
        }
    };

    const handleAcceptRegeneration = async () => {
        // TODO: Implement accept regeneration API (simulate for now)
        setRegenerationPreview(null);
        setTimeout(() => loadUniverse(), 500);
    };

    const handleRejectRegeneration = () => {
        setRegenerationPreview(null);
    };

    const handleTimelineEventUpdate = async (eventId: string, field: string, value: any) => {
        if (!currentProfile?.id || !timeline) return;

        // Optimistically update local state
        setTimeline(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                events: prev.events.map(e =>
                    e.id === eventId ? { ...e, [field]: value } : e
                ),
            };
        });

        // Persist to backend
        try {
            await identityApi.updateTimelineEvent(currentProfile.id, eventId, { [field]: value });
        } catch (err) {
            console.error('Failed to update timeline event:', err);
            // Reload on error
            loadUniverse();
        }
    };

    const handleFieldUpdate = async (field: string, value: any) => {
        if (!currentProfile?.id || !universe) return;

        const schema = getFieldByKey(field);
        if (!schema) {
            console.error('Unknown field:', field);
            return;
        }

        // Optimistically update local state immediately (no reload)
        setUniverse(prev => {
            if (!prev) return prev;

            if (schema.source === 'style_profile') {
                return {
                    ...prev,
                    style_profile: prev.style_profile
                        ? { ...prev.style_profile, [field]: value }
                        : null,
                };
            } else if (schema.source === 'profile') {
                return {
                    ...prev,
                    [field]: value,
                };
            } else {
                return {
                    ...prev,
                    identity_graph: { ...prev.identity_graph, [field]: value },
                };
            }
        });

        // Persist to backend in background
        try {
            if (schema.source === 'style_profile') {
                await identityApi.updateStyleProfile(currentProfile.id, { [field]: value });
            } else if (schema.source === 'profile') {
                await profilesApi.update(currentProfile.id, { [field]: value });
            } else {
                await identityApi.updateIdentityGraph(currentProfile.id, { [field]: value });
            }
        } catch (err) {
            console.error('Failed to update field:', err);
            // Revert on error by reloading
            loadUniverse();
        }
    };

    if (!currentProfile) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 mb-4">Loading profile...</p>
                    <Link href="/dashboard">
                        <Button variant="outline" className="border-slate-200 text-slate-600">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-50">
            {/* Top Bar */}
            <header className="absolute top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 pointer-events-none">
                <div className="flex items-center gap-1 pointer-events-auto bg-white/80 backdrop-blur-md p-1 px-1.5 rounded-xl border border-slate-200/60 shadow-sm w-max">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-3 font-medium h-8">
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            Dashboard
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center gap-2 md:gap-3 pointer-events-auto flex-wrap justify-end">
                    <div className="flex items-center bg-white/80 backdrop-blur-md rounded-xl border border-slate-200/60 shadow-sm overflow-hidden h-10">
                        <Link href="/dashboard/identity" className="h-full">
                            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-none px-4 font-medium h-full border-r border-slate-200/60 transition-colors">
                                <User className="w-4 h-4 mr-1.5" />
                                View Timeline
                            </Button>
                        </Link>
                        <div className="px-4 text-sm text-slate-500 font-medium flex items-center h-full">
                            Completeness:
                            <span className="ml-1.5 text-cyan-600 font-bold">{universe?.completeness_score ?? 0}%</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/60 shadow-sm">
                        {currentProfile?.id && (
                            <PersonalizeAgentCard
                                profileId={currentProfile.id}
                                writingSamplesCount={universe?.style_profile?.writing_samples_count}
                                compact
                            />
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            className={
                                (universe?.completeness_score ?? 0) < 70
                                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg px-3 font-medium h-8"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-3 font-medium h-8"
                            }
                            onClick={() => setPixoChatOpen(true)}
                        >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            Chat with Pixo
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg px-4 shadow-sm font-medium h-8"
                            onClick={handleRegenerate}
                            disabled={regenerating}
                        >
                            {regenerating ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-1.5 text-white" />
                            )}
                            {regenerating ? 'Regenerating...' : 'Regenerate'}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            {loading ? (
                <div className="absolute inset-0 z-10">
                    <IdentityLoader isLoading={loading} />
                </div>
            ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                    <div className="text-center p-8 bg-white shadow-xl rounded-2xl border border-red-100 max-w-md">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
                        <p className="text-slate-500 mb-4">{error}</p>
                        <Button onClick={loadUniverse} className="bg-cyan-600 hover:bg-cyan-700">
                            Try Again
                        </Button>
                    </div>
                </div>
            ) : universe ? (
                <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0"
                >
                    <IdentityComposition
                        universe={universe}
                        timeline={timeline}
                        onFieldUpdate={handleFieldUpdate}
                        onTimelineEventUpdate={handleTimelineEventUpdate}
                        regenerationPreview={regenerationPreview}
                    />
                </motion.div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-500">Preparing identity view...</p>
                    </div>
                </div>
            )}

            {/* Pixo Chat Dialog */}
            <PixoChatDialog
                open={pixoChatOpen}
                onOpenChange={setPixoChatOpen}
                onComplete={() => {
                    setPixoChatOpen(false);
                    loadUniverse();
                }}
            />

            {/* Regeneration Preview Overlay */}
            <AnimatePresence>
                {regenerationPreview && regenerationPreview.changes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-[90vw] w-full max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-cyan-600" />
                                    Regeneration Preview
                                </h3>
                                <Button size="icon" variant="ghost" onClick={handleRejectRegeneration}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="overflow-y-auto p-6 space-y-4">
                                {regenerationPreview.changes.map((change, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <div className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">{change.field_name}</div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-white rounded-lg border border-red-100 shadow-sm relative h-[60vh] overflow-y-auto">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
                                                <div className="text-xs font-semibold text-red-500 mb-1 sticky top-0 bg-white pb-2 z-10 border-b border-red-50">CURRENT</div>
                                                <p className="text-sm text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                                                    {typeof change.current_value === 'string'
                                                        ? change.current_value
                                                        : JSON.stringify(change.current_value, null, 2)
                                                    }
                                                </p>
                                            </div>
                                            <div className="p-4 bg-white rounded-lg border border-green-100 shadow-sm relative h-[60vh] overflow-y-auto">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                                <div className="text-xs font-semibold text-green-600 mb-1 sticky top-0 bg-white pb-2 z-10 border-b border-green-50">PROPOSED</div>
                                                <p className="text-sm text-slate-800 whitespace-pre-wrap font-mono leading-relaxed">
                                                    {typeof change.proposed_value === 'string'
                                                        ? change.proposed_value
                                                        : JSON.stringify(change.proposed_value, null, 2)
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                                <Button
                                    onClick={handleAcceptRegeneration}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Accept Logic Improvements
                                </Button>
                                <Button
                                    onClick={handleRejectRegeneration}
                                    variant="outline"
                                    className="flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
