'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdentityComposition, Region } from './useIdentityComposition';
import { IdentityUniverse, RegenerationPreview, Timeline } from '@/lib/api/identity';
import { InlineEditor } from './InlineEditor';
import { CareerTimeline } from './CareerTimeline';
import { cn } from '@/lib/utils';
import { Sparkles, Edit2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { getFieldByKey, isFieldEmpty, FieldSchema, BELIEFS_OPTIONS } from '@/lib/schemas/identity-schema';

interface IdentityCompositionProps {
    universe: IdentityUniverse;
    timeline: Timeline | null;
    onFieldUpdate: (field: string, value: any) => Promise<void>;
    onTimelineEventUpdate?: (eventId: string, field: string, value: any) => Promise<void>;
    regenerationPreview: RegenerationPreview | null;
}

export default function IdentityComposition({ universe, timeline, onFieldUpdate, onTimelineEventUpdate, regenerationPreview }: IdentityCompositionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Set initial dimensions immediately
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width: width || window.innerWidth, height: height || window.innerHeight });
            }
        };

        // Set initial dimensions
        updateDimensions();

        // Also use ResizeObserver for dynamic updates
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                setDimensions({ width, height });
            }
        });
        observer.observe(containerRef.current);

        // Fallback: also listen to window resize
        window.addEventListener('resize', updateDimensions);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    // Ensure we have valid dimensions before calling the hook
    const effectiveWidth = dimensions.width > 0 ? dimensions.width : (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const effectiveHeight = dimensions.height > 0 ? dimensions.height : (typeof window !== 'undefined' ? window.innerHeight : 800);

    const { regions, completeness } = useIdentityComposition({
        universe,
        width: effectiveWidth,
        height: effectiveHeight
    });

    const activeRegion = useMemo(() =>
        regions.find(r => r.id === activeRegionId),
        [regions, activeRegionId]);

    const handleRegionClick = useCallback((regionId: string) => {
        setActiveRegionId(regionId === activeRegionId ? null : regionId);
        setEditingField(null);
    }, [activeRegionId]);

    const handleEditField = (field: string) => {
        setEditingField(field);
    };

    const handleSaveEdit = async (field: string, value: any) => {
        await onFieldUpdate(field, value);
        // Keep editor open or close? Close for now.
        setEditingField(null);
    };

    // Use effective dimensions for rendering
    const displayWidth = effectiveWidth;
    const displayHeight = effectiveHeight;

    // Helper to get text color based on region color
    // We'll use distinct color mapping
    const getRegionColors = (color: string, isActive: boolean) => {
        const map: Record<string, any> = {
            slate: { fill: isActive ? '#f8fafc' : '#ffffff', stroke: '#e2e8f0', text: 'text-slate-900', label: 'text-slate-500' },
            cyan: { fill: isActive ? '#ecfeff' : '#f0fdfa', stroke: '#cffafe', text: 'text-cyan-900', label: 'text-cyan-600' },
            indigo: { fill: isActive ? '#eef2ff' : '#f5f3ff', stroke: '#e0e7ff', text: 'text-indigo-900', label: 'text-indigo-600' },
            emerald: { fill: isActive ? '#ecfdf5' : '#f0fdf4', stroke: '#d1fae5', text: 'text-emerald-900', label: 'text-emerald-600' },
            amber: { fill: isActive ? '#fffbeb' : '#fff7ed', stroke: '#fef3c7', text: 'text-amber-900', label: 'text-amber-600' },
            violet: { fill: isActive ? '#f5f3ff' : '#faf5ff', stroke: '#ede9fe', text: 'text-violet-900', label: 'text-violet-600' },
        };
        return map[color] || map.slate;
    };

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-50 select-none">
            {regions.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-500">Loading identity regions...</p>
                    </div>
                </div>
            ) : (
                <>
                    <svg width={displayWidth} height={displayHeight} className="absolute inset-0">
                        <AnimatePresence>
                            {regions.map((region) => {
                                const isActive = activeRegionId === region.id;
                                const colors = getRegionColors(region.color, isActive);
                                const isMuted = activeRegionId && !isActive;

                                return (
                                    <motion.g
                                        key={region.id}
                                        initial={{ opacity: 0 }}
                                        animate={{
                                            opacity: isMuted ? 0.3 : 1,
                                            scale: isActive ? 1.02 : 1, // Slight pop
                                        }}
                                        transition={{ duration: 0.4 }}
                                        onClick={() => handleRegionClick(region.id)}
                                        className="cursor-pointer transition-colors duration-300"
                                        style={{ transformOrigin: `${region.center[0]}px ${region.center[1]}px` }}
                                    >
                                        {/* The Region Cell */}
                                        <path
                                            d={region.path}
                                            fill={colors.fill}
                                            stroke="white"
                                            strokeWidth="4"
                                            className="transition-all duration-300 ease-out hover:brightness-95"
                                        />

                                        {/* Border inside for definition */}
                                        <path
                                            d={region.path}
                                            fill="none"
                                            stroke={colors.stroke}
                                            strokeWidth="1"
                                            className="pointer-events-none"
                                        />

                                        {/* Embedded Content via ForeignObject */}
                                        {/* We center content at centroid */}
                                        <foreignObject
                                            x={region.center[0] - 120}
                                            y={region.center[1] - 100}
                                            width="240"
                                            height="200"
                                            className="pointer-events-none"
                                        >
                                            <div className={cn(
                                                "w-full h-full flex flex-col items-center justify-center text-center p-2 transition-all duration-500",
                                                isActive ? "opacity-0" : "opacity-100" // Hide summary when active/zoomed? No, keep it simple.
                                            )}>
                                                <div className={cn("text-xs font-bold uppercase tracking-wider mb-2", colors.label)}>
                                                    {region.label}
                                                </div>

                                                {/* Region Specific Summary Rendering */}
                                                {region.id === 'core' && (
                                                    <>
                                                        <div className="text-xl font-bold text-slate-900 leading-tight mb-1 font-serif">
                                                            {region.data.current_role || "Current Role"}
                                                        </div>
                                                        <div className="text-sm text-slate-500">{region.data.industry}</div>
                                                    </>
                                                )}

                                                {region.id === 'content' && (
                                                    <div className="flex flex-wrap gap-1 justify-center">
                                                        {(region.data.pillars || []).slice(0, 3).map((p: string, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 bg-cyan-100 text-cyan-800 text-[10px] rounded-full">
                                                                {p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {region.id === 'expertise' && (
                                                    <div className="space-y-1">
                                                        {(region.data.areas || []).slice(0, 3).map((a: string, i: number) => (
                                                            <div key={i} className="text-xs text-indigo-900 font-medium truncate max-w-[200px]">{a}</div>
                                                        ))}
                                                    </div>
                                                )}

                                                {region.id === 'strategy' && region.data.audience && (
                                                    <div className="text-xs text-emerald-800 leading-relaxed italic line-clamp-3">
                                                        &ldquo;{region.data.audience}&rdquo;
                                                    </div>
                                                )}

                                            </div>
                                        </foreignObject>
                                    </motion.g>
                                );
                            })}
                        </AnimatePresence>
                    </svg>

                    {/* Active Region Overlay (Zoomed detail view) */}
                    <AnimatePresence>
                        {activeRegion && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 z-10 flex items-center justify-center p-12 pointer-events-none"
                            >
                                <div
                                    className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-8 w-full max-w-2xl h-full max-h-[600px] pointer-events-auto overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <div className={cn("text-xs font-bold uppercase tracking-wider mb-1",
                                                activeRegion.color === 'slate' ? 'text-slate-500' :
                                                    activeRegion.color === 'cyan' ? 'text-cyan-600' :
                                                        activeRegion.color === 'indigo' ? 'text-indigo-600' :
                                                            activeRegion.color === 'emerald' ? 'text-emerald-600' :
                                                                activeRegion.color === 'amber' ? 'text-amber-600' : 'text-violet-600'
                                            )}>
                                                {activeRegion.label} Domain
                                            </div>
                                            <h2 className="text-3xl font-bold text-slate-900 font-serif">
                                                {activeRegion.id === 'core' ? (activeRegion.data.current_role || 'Current Role') : activeRegion.label}
                                            </h2>
                                        </div>
                                        <button
                                            onClick={() => setActiveRegionId(null)}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                            <Sparkles className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </div>

                                    {/* Career Timeline for Expertise Region */}
                                    {activeRegion.id === 'expertise' && timeline && timeline.events.length > 0 && (
                                        <div className="mb-8">
                                            <CareerTimeline
                                                timeline={timeline}
                                                onEventUpdate={onTimelineEventUpdate}
                                            />
                                        </div>
                                    )}

                                    {/* Render ALL Fields from Schema */}
                                    <div className="space-y-6">
                                        {activeRegion.fields.map(fieldKey => {
                                            const schema = getFieldByKey(fieldKey);
                                            if (!schema) return null;

                                            // Get value from appropriate source
                                            let value: any;
                                            if (schema.source === 'style_profile') {
                                                value = universe.style_profile ? (universe.style_profile as any)[fieldKey] : null;
                                            } else if (schema.source === 'profile') {
                                                value = (universe as any)[fieldKey];
                                            } else {
                                                value = (universe.identity_graph as any)[fieldKey];
                                            }

                                            const isEmpty = isFieldEmpty(value, schema);

                                            return (
                                                <div key={fieldKey} className="group">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-semibold text-slate-900">
                                                                {schema.label}
                                                            </h3>
                                                            {schema.required && isEmpty && (
                                                                <span className="flex items-center gap-1 text-xs text-red-500">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Required
                                                                </span>
                                                            )}
                                                            {schema.required && !isEmpty && (
                                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleEditField(fieldKey)}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-cyan-50 text-cyan-600 rounded-md transition-all text-xs flex items-center gap-1"
                                                        >
                                                            <Edit2 className="w-3 h-3" /> Edit
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-2">{schema.description}</p>

                                                    <div
                                                        className={cn(
                                                            "p-4 rounded-xl border transition-colors cursor-pointer",
                                                            isEmpty
                                                                ? schema.required
                                                                    ? "border-dashed border-red-200 bg-red-50/50 hover:border-red-300"
                                                                    : "border-dashed border-slate-300 bg-slate-50 hover:border-cyan-300"
                                                                : "border-slate-100 bg-slate-50/50 hover:border-cyan-300"
                                                        )}
                                                        onClick={() => handleEditField(fieldKey)}
                                                    >
                                                        {isEmpty ? (
                                                            <div className={cn(
                                                                "flex items-center justify-center py-4 gap-2",
                                                                schema.required ? "text-red-400" : "text-slate-400"
                                                            )}>
                                                                <Plus className="w-4 h-4" />
                                                                <span className="text-sm">
                                                                    {schema.required ? `Add ${schema.label} (required)` : `Add ${schema.label}`}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="prose prose-sm max-w-none text-slate-600">
                                                                {/* Render based on field type */}
                                                                {(schema.type === 'array' || schema.type === 'array_enum') && Array.isArray(value) && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {value.map((item: any, i: number) => (
                                                                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-sm shadow-sm">
                                                                                {typeof item === 'string' ? item : JSON.stringify(item)}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {schema.type === 'object_array' && Array.isArray(value) && (
                                                                    <div className="space-y-2">
                                                                        {value.map((item: any, i: number) => {
                                                                            if (item.degree || item.school) {
                                                                                return (
                                                                                    <div key={i} className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm">
                                                                                        <span className="font-medium">{item.degree || 'Degree'}</span>
                                                                                        {item.school && <span className="text-slate-500"> @ {item.school}</span>}
                                                                                        {item.year && <span className="text-slate-400"> ({item.year})</span>}
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <div key={i} className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm">
                                                                                    {JSON.stringify(item)}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {(schema.type === 'string' || schema.type === 'text' || schema.type === 'enum') && (
                                                                    <p>{value}</p>
                                                                )}
                                                                {schema.type === 'slider_group' && typeof value === 'object' && (
                                                                    <div className="space-y-2">
                                                                        {Object.entries(value).map(([key, val]) => (
                                                                            <div key={key} className="flex items-center justify-between text-sm">
                                                                                <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                                                                <span className="font-medium">{Math.round(Number(val) * 100)}%</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {schema.type === 'dict' && typeof value === 'object' && Object.keys(value).length > 0 && (
                                                                    <div className="text-sm text-slate-500">
                                                                        {Object.keys(value).length} entries
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            {/* Inline Editor Modal */}
            <AnimatePresence>
                {editingField && (() => {
                    const schema = getFieldByKey(editingField);
                    // Get value from appropriate source based on schema
                    let value: any;
                    if (schema?.source === 'style_profile') {
                        value = universe.style_profile ? (universe.style_profile as any)[editingField] : null;
                    } else if (schema?.source === 'profile') {
                        value = (universe as any)[editingField];
                    } else {
                        value = (universe.identity_graph as any)[editingField];
                    }
                    const isEmpty = schema ? isFieldEmpty(value, schema) : !value;

                    return (
                        <InlineEditor
                            node={{
                                id: 'editor',
                                field: editingField,
                                value: value,
                                isEmpty: isEmpty,
                                // Mock unused props
                                x: 0, y: 0, type: 'core', label: schema?.label || editingField, size: 'lg'
                            }}
                            onSave={handleSaveEdit}
                            onClose={() => setEditingField(null)}
                        />
                    );
                })()}
            </AnimatePresence>

        </div>
    );
}
