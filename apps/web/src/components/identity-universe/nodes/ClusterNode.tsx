'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NodeProps {
    node: any;
    isFocused: boolean;
    onClick: () => void;
}

export function ClusterNode({ node, isFocused, onClick }: NodeProps) {
    // Dynamic color based on node type
    const getColors = (type: string) => {
        switch (type) {
            case 'expertise': return 'bg-indigo-50 border-indigo-200 text-indigo-900';
            case 'interest': return 'bg-amber-50 border-amber-200 text-amber-900';
            case 'belief': return 'bg-violet-50 border-violet-200 text-violet-900';
            case 'highlight': return 'bg-emerald-50 border-emerald-200 text-emerald-900';
            default: return 'bg-slate-50 border-slate-200 text-slate-900';
        }
    };

    const colors = getColors(node.type);

    return (
        <motion.div
            layoutId={node.id}
            onClick={onClick}
            className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center text-center px-4 py-2 rounded-full transition-all duration-300",
                "border shadow-sm hover:shadow-md",
                colors,
                isFocused ? "scale-125 z-30 shadow-lg ring-2 ring-offset-2 ring-cyan-400" : "z-20",
            )}
            style={{
                left: node.x,
                top: node.y,
            }}
            whileHover={{ scale: 1.1 }}
        >
            <span className="text-xs font-medium whitespace-nowrap max-w-[120px] truncate">
                {node.label}
            </span>
        </motion.div>
    );
}
