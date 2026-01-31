import { useEffect, useMemo, useState } from 'react';
import { Delaunay } from 'd3-delaunay';
import { IdentityUniverse } from '@/lib/api/identity';
import { 
    IDENTITY_SCHEMA, 
    getFieldsByRegion, 
    REGION_DEFINITIONS,
    calculateCompleteness,
    CompletenessResult
} from '@/lib/schemas/identity-schema';

export interface Region {
    id: 'core' | 'content' | 'expertise' | 'character' | 'strategy' | 'voice';
    label: string;
    path: string; // SVG Path data
    center: [number, number]; // Centroid for text placement
    color: string;
    data: Record<string, any>; // Raw data for this region (keyed by field name)
    fields: string[]; // All editable fields in this region (from schema)
}

interface UseIdentityCompositionProps {
    universe: IdentityUniverse | null;
    width: number;
    height: number;
}

interface UseIdentityCompositionResult {
    regions: Region[];
    completeness: CompletenessResult | null;
}

export function useIdentityComposition({ universe, width, height }: UseIdentityCompositionProps): UseIdentityCompositionResult {
    const [regions, setRegions] = useState<Region[]>([]);

    // Calculate completeness from schema
    const completeness = useMemo(() => {
        if (!universe) return null;
        return calculateCompleteness(
            universe.identity_graph as unknown as Record<string, any>,
            universe.style_profile as unknown as Record<string, any>
        );
    }, [universe]);

    const computedRegions = useMemo(() => {
        if (!universe || width === 0 || height === 0) return [];

        const identity = universe.identity_graph;
        const style = universe.style_profile;

        // 1. Define Seeds (Positions relative to 0-1 coordinate space)
        const seeds = REGION_DEFINITIONS.map(r => {
            // Position mapping
            const positions: Record<string, { x: number; y: number }> = {
                core: { x: 0.5, y: 0.5 },
                content: { x: 0.5, y: 0.2 },
                expertise: { x: 0.8, y: 0.4 },
                strategy: { x: 0.8, y: 0.8 },
                character: { x: 0.2, y: 0.8 },
                voice: { x: 0.2, y: 0.4 },
            };
            return { ...r, ...positions[r.id] };
        });

        // Scale seeds to canvas
        const points = seeds.map(s => [s.x * width, s.y * height] as [number, number]);

        // 2. Compute Voronoi
        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, width, height]);

        // 3. Generate Region Objects using SCHEMA as source of truth
        const newRegions = seeds.map((seed, i) => {
            const polygon = voronoi.cellPolygon(i);
            if (!polygon) return null;

            // Compute centroid
            let cx = 0, cy = 0, n = 0;
            polygon.forEach(([px, py]) => { cx += px; cy += py; n++; });
            const center: [number, number] = [cx / n, cy / n];

            // Generate Path Data
            const path = voronoi.renderCell(i);

            // Get ALL fields for this region from schema
            const schemaFields = getFieldsByRegion(seed.id);
            const regionFields = schemaFields.map(f => f.key);

            // Build data object with ALL fields from schema
            const regionData: Record<string, any> = {};
            for (const field of schemaFields) {
                if (field.source === 'style_profile') {
                    regionData[field.key] = style?.[field.key as keyof typeof style] ?? null;
                } else {
                    regionData[field.key] = identity[field.key as keyof typeof identity] ?? null;
                }
            }

            return {
                id: seed.id as Region['id'],
                label: seed.label,
                path,
                center,
                color: seed.color,
                data: regionData,
                fields: regionFields
            };
        }).filter(Boolean) as Region[];

        return newRegions;

    }, [universe, width, height]);

    useEffect(() => {
        setRegions(computedRegions);
    }, [computedRegions]);

    return { regions, completeness };
}
