'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IdentityUniverse, RegenerationPreview } from '@/lib/api/identity';
import { CoreNode } from './nodes/CoreNode';
import { ClusterNode } from './nodes/ClusterNode';
import { PillarNode } from './nodes/PillarNode';
import { InlineEditor } from './InlineEditor';
import { ConnectionLines } from './ConnectionLines';
import { useIdentityLayout } from './useIdentityLayout';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface IdentityCanvasProps {
    universe: IdentityUniverse;
    onFieldUpdate: (field: string, value: any) => Promise<void>;
    regenerationPreview: RegenerationPreview | null;
}

export function IdentityCanvas({ universe, onFieldUpdate, regenerationPreview }: IdentityCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

    // Measure container
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Layout Engine
    const { nodes, links } = useIdentityLayout({
        universe,
        width: dimensions.width,
        height: dimensions.height
    });

    // Interaction Handlers
    const handleNodeClick = useCallback((nodeId: string) => {
        if (focusedNodeId === nodeId) {
            setEditingNodeId(nodeId);
        } else {
            setFocusedNodeId(nodeId);
            setEditingNodeId(null);
        }
    }, [focusedNodeId]);

    const handleBackgroundClick = useCallback(() => {
        setFocusedNodeId(null);
        setEditingNodeId(null);
    }, []);

    const handleSaveEdit = useCallback(async (field: string, value: any) => {
        await onFieldUpdate(field, value);
        setEditingNodeId(null);
    }, [onFieldUpdate]);

    const focusedNodeData = useMemo(() =>
        nodes.find(n => n.id === focusedNodeId),
        [nodes, focusedNodeId]);

    // Legend Data
    const legendItems = [
        { label: 'Core Identity', color: 'bg-slate-900' },
        { label: 'Content Pillars', color: 'bg-cyan-600' },
        { label: 'Expertise', color: 'bg-indigo-600' },
        { label: 'Interests', color: 'bg-amber-500' },
        { label: 'Beliefs', color: 'bg-violet-600' },
    ];

    if (dimensions.width === 0) return <div ref={containerRef} className="w-full h-full" />;

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing"
            onClick={handleBackgroundClick}
        >
            {/* SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <ConnectionLines
                    connections={links as any}
                    nodes={nodes}
                    focusedNode={focusedNodeId}
                />
            </svg>

            {/* HTML Layer for Nodes */}
            <div className="absolute inset-0 w-full h-full">
                {nodes.map((node) => {
                    const isFocused = focusedNodeId === node.id;
                    const isPreviewChange = !!regenerationPreview?.changes.some(
                        c => c.field_name === node.field
                    );

                    if (node.type === 'core') {
                        return (
                            <CoreNode
                                key={node.id}
                                node={node}
                                isFocused={isFocused}
                                onClick={() => handleNodeClick(node.id)}
                            />
                        );
                    }
                    if (node.type === 'pillar') {
                        return (
                            <PillarNode
                                key={node.id}
                                node={node}
                                isFocused={isFocused}
                                onClick={() => handleNodeClick(node.id)}
                            />
                        );
                    }
                    return (
                        <ClusterNode
                            key={node.id}
                            node={node}
                            isFocused={isFocused}
                            onClick={() => handleNodeClick(node.id)}
                        />
                    );
                })}
            </div>

            {/* Controls / UI Overlay */}
            <div className="absolute bottom-6 left-6 flex flex-col gap-4 pointer-events-none">
                {/* Legend */}
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl shadow-sm pointer-events-auto">
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Legend</p>
                    <div className="space-y-2">
                        {legendItems.map((item) => (
                            <div key={item.label} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                                <span className="text-xs text-slate-600 font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Persona Essence Display */}
            {universe.persona.persona_prompt && (
                <div className="absolute bottom-6 right-6 max-w-sm bg-white/80 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl shadow-sm pointer-events-auto">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-indigo-500 rounded-full" />
                        <h4 className="text-sm font-semibold text-slate-900">Persona Essence</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {universe.persona.persona_prompt}
                    </p>
                </div>
            )}

            {/* Inline Editor */}
            <AnimatePresence>
                {editingNodeId && focusedNodeData && (
                    <InlineEditor
                        node={focusedNodeData as any}
                        onSave={handleSaveEdit}
                        onClose={() => setEditingNodeId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
