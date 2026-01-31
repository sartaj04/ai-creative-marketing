import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { IdentityUniverse } from '@/lib/api/identity';

export interface SimulationNode extends d3.SimulationNodeDatum {
    id: string;
    type: 'core' | 'pillar' | 'expertise' | 'interest' | 'belief' | 'goal' | 'audience' | 'highlight';
    label: string;
    field: string;
    value: any;
    radius: number; // For collision
    targetRadius: number; // Distance from center
    angle?: number; // Preferred angle (optional)
    color: string;
}

export interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
    source: string | SimulationNode;
    target: string | SimulationNode;
    value: number;
}

interface UseIdentityLayoutProps {
    universe: IdentityUniverse | null;
    width: number;
    height: number;
}

export function useIdentityLayout({ universe, width, height }: UseIdentityLayoutProps) {
    const [nodes, setNodes] = useState<SimulationNode[]>([]);
    const [links, setLinks] = useState<SimulationLink[]>([]);
    const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);

    // 1. Transform Universe Data into Simulation Nodes
    const data = useMemo(() => {
        if (!universe) return { nodes: [], links: [] };

        const identity = universe.identity_graph;
        const nodeList: SimulationNode[] = [];
        const linkList: SimulationLink[] = [];

        // Colors (Light Theme aligned)
        const COLORS = {
            core: '#0f172a', // Slate 900
            pillar: '#0891b2', // Cyan 600
            expertise: '#4f46e5', // Indigo 600
            interest: '#f59e0b', // Amber 500
            belief: '#7c3aed', // Violet 600
            highlight: '#10b981', // Emerald 500
        };

        // --- CORE ---
        nodeList.push({
            id: 'core',
            type: 'core',
            label: identity.current_role || 'Your Identity',
            field: 'current_role',
            value: identity,
            radius: 45,
            targetRadius: 0,
            color: COLORS.core,
            fx: width / 2, // Fix center X
            fy: height / 2, // Fix center Y
        });

        // --- PILLARS (Inner Ring) ---
        (identity.content_pillars || []).forEach((pillar, i) => {
            const id = `pillar-${i}`;
            nodeList.push({
                id,
                type: 'pillar',
                label: pillar,
                field: 'content_pillars',
                value: pillar,
                radius: 35,
                targetRadius: 180, // Distance from core
                color: COLORS.pillar,
            });
            linkList.push({ source: 'core', target: id, value: 2 });
        });

        // If no pillars, add a placeholder
        if ((identity.content_pillars || []).length === 0) {
            nodeList.push({
                id: 'pillar-add',
                type: 'pillar',
                label: 'Add Pillar',
                field: 'content_pillars',
                value: null,
                radius: 35,
                targetRadius: 180,
                color: '#cbd5e1', // Slate 300
            });
            linkList.push({ source: 'core', target: 'pillar-add', value: 1 });
        }

        // --- EXPERTISE (Middle Ring / Cluster) ---
        (identity.expertise_areas || []).slice(0, 8).forEach((item, i) => {
            nodeList.push({
                id: `expertise-${i}`,
                type: 'expertise',
                label: item,
                field: 'expertise_areas',
                value: item,
                radius: 28,
                targetRadius: 300,
                color: COLORS.expertise,
            });
            // Weak link to core to keep them generally oriented but not tight
            // linkList.push({ source: 'core', target: `expertise-${i}`, value: 0.1 });
        });

        // --- INTERESTS (Outer Cloud) ---
        // Distributed in separate quadrant if we want, or just mixed in outer ring
        (identity.interests || []).slice(0, 6).forEach((item, i) => {
            nodeList.push({
                id: `interest-${i}`,
                type: 'interest',
                label: item,
                field: 'interests',
                value: item,
                radius: 22,
                targetRadius: 380,
                color: COLORS.interest,
            });
        });

        // --- BELIEFS (Outer Cloud) ---
        (identity.beliefs || []).slice(0, 5).forEach((item, i) => {
            nodeList.push({
                id: `belief-${i}`,
                type: 'belief',
                label: item,
                field: 'beliefs',
                value: item,
                radius: 24,
                targetRadius: 360,
                color: COLORS.belief,
            });
        });

        // --- HIGHLIGHTS (Outer Cloud) ---
        (identity.career_highlights || []).slice(0, 4).forEach((item, i) => {
            nodeList.push({
                id: `highlight-${i}`,
                type: 'highlight',
                label: item,
                field: 'career_highlights',
                value: item,
                radius: 26,
                targetRadius: 400,
                color: COLORS.highlight,
            });
        });

        return { nodes: nodeList, links: linkList };
    }, [universe, width, height]);

    // 2. Run Simulation
    useEffect(() => {
        if (!data.nodes.length || !width || !height) return;

        // Cleanup old simulation
        if (simulationRef.current) simulationRef.current.stop();

        // Style Physics Influence
        // "Formal" = tighter packing, "Casual" = looser
        const tone = universe?.style_profile?.tone_sliders.formal_casual ?? 0.5;
        const spacing = 1.2 + (1 - tone) * 0.5; // 1.2 to 1.7 overlap buffer

        const simulation = d3.forceSimulation<SimulationNode>(data.nodes)
            .force('link', d3.forceLink<SimulationNode, SimulationLink>(data.links)
                .id(d => d.id)
                .distance(d => (d.source as any).radius + (d.target as any).radius + 50)
                .strength(0.5)
            )
            .force('charge', d3.forceManyBody().strength(-300)) // Repel
            .force('collide', d3.forceCollide<SimulationNode>().radius(d => d.radius * spacing).strength(0.9))
            .force('radial', d3.forceRadial<SimulationNode>(
                d => d.targetRadius,
                width / 2,
                height / 2
            ).strength(0.8)) // Strong pull to intended ring
            .alphaDecay(0.05) // Settle relatively quickly
            .on('tick', () => {
                setNodes([...data.nodes]);
                setLinks([...data.links]);
            });

        simulationRef.current = simulation;

        return () => {
            simulation.stop();
        };
    }, [data, width, height, universe?.style_profile]);

    // Drag interactions (if we want them later)
    const drag = (node: SimulationNode) => {
        // Implement d3 drag logic if needed used by the canvas
    };

    return { nodes, links };
}
