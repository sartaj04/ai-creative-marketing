'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle, Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfileStore } from '@/stores/profile-store';
import { identityApi, IdentityUniverse, RegenerationPreview } from '@/lib/api/identity';
import IdentityComposition from '@/components/identity-universe/IdentityComposition';
import PersonalizeAgentCard from '@/components/dashboard/PersonalizeAgentCard';
import { IdentityLoader } from '@/components/identity-universe/IdentityLoader';
import { profilesApi } from '@/lib/api/profiles';
import { getFieldByKey } from '@/lib/schemas/identity-schema';

export default function IdentityUniversePage() {
    const router = useRouter();
    const { currentProfile } = useProfileStore();
    const [universe, setUniverse] = useState<IdentityUniverse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState(false);
    const [regenerationPreview, setRegenerationPreview] = useState<RegenerationPreview | null>(null);

    const loadUniverse = useCallback(async () => {
        if (!currentProfile?.id) return;

        try {
            setLoading(true);
            setError(null);
            const data = await identityApi.getIdentityUniverse(currentProfile.id);
            setUniverse(data);
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
            <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="text-sm text-slate-500 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200">
                        Completeness: <span className="text-cyan-600 font-semibold">{universe?.completeness_score ?? 0}%</span>
                    </div>
                    {currentProfile?.id && (
                        <PersonalizeAgentCard
                            profileId={currentProfile.id}
                            writingSamplesCount={universe?.style_profile?.writing_samples_count}
                            compact
                        />
                    )}
                    <Button
                        variant="default"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
                        onClick={handleRegenerate}
                        disabled={regenerating}
                    >
                        {regenerating ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Regenerate Identity
                    </Button>
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
                        onFieldUpdate={handleFieldUpdate}
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
