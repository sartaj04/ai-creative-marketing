'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NodeProps {
    node: any;
    isFocused: boolean;
    onClick: () => void;
}

export function PillarNode({ node, isFocused, onClick }: NodeProps) {
    return (
        <motion.div
            layoutId={node.id}
            onClick={onClick}
            className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex items-center justify-center text-center p-3 rounded-full transition-all duration-300",
                "bg-white border hover:shadow-lg",
                isFocused ? "w-32 h-32 z-40 border-cyan-500 shadow-xl" : "w-24 h-24 z-20 border-slate-200 shadow-md",
                node.value ? "" : "border-dashed border-slate-300 text-slate-400"
            )}
            style={{
                left: node.x,
                top: node.y,
            }}
            whileHover={{ scale: 1.1 }}
        >
            <div>
                <span className={cn(
                    "font-semibold block",
                    isFocused ? "text-sm text-slate-900" : "text-xs text-slate-700",
                    !node.value && "italic"
                )}>
                    {node.label}
                </span>
            </div>
        </motion.div>
    );
}
