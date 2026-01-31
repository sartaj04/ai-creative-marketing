'use client';

import { motion } from 'framer-motion';

interface ConnectionLinesProps {
    connections: any[];
    nodes: any[];
    focusedNode: string | null;
}

export function ConnectionLines({ connections, nodes, focusedNode }: ConnectionLinesProps) {
    if (!nodes.length) return null;

    // Create a map for quick node lookups
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    return (
        <g className="connection-lines">
            {connections.map((connection, idx) => {
                // Handle both d3-link object (source/target are nodes) and raw ID links
                const sourceId = typeof connection.source === 'object' ? connection.source.id : connection.source;
                const targetId = typeof connection.target === 'object' ? connection.target.id : connection.target;

                const fromNode = nodeMap.get(sourceId);
                const toNode = nodeMap.get(targetId);

                if (!fromNode || !toNode) return null;

                const isConnectedToFocus = focusedNode === sourceId || focusedNode === targetId;

                // Opacity logic:
                // If nothing focused -> 0.2 (light)
                // If focused -> connected are 0.6, others 0.05
                const opacity = focusedNode
                    ? (isConnectedToFocus ? 0.6 : 0.05)
                    : 0.15;

                const strokeColor = isConnectedToFocus ? '#0891b2' : '#cbd5e1'; // Cyan-600 or Slate-300
                const strokeWidth = isConnectedToFocus ? 2 : 1;

                return (
                    <motion.line
                        key={`${sourceId}-${targetId}`}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        initial={{ opacity: 0 }}
                        animate={{ opacity, stroke: strokeColor, strokeWidth }}
                        transition={{ duration: 0.3 }}
                    />
                );
            })}
        </g>
    );
}
