'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface NodeProps {
    node: any;
    isFocused: boolean;
    onClick: () => void;
}

export function CoreNode({ node, isFocused, onClick }: NodeProps) {
    return (
        <motion.div
            layoutId={node.id}
            onClick={onClick}
            className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center justify-center p-6 rounded-full transition-all duration-300",
                "bg-white border-2 hover:shadow-xl",
                isFocused ? "w-48 h-48 z-50 border-cyan-500 shadow-2xl shadow-cyan-500/20" : "w-32 h-32 z-10 border-slate-200 shadow-lg",
                node.value ? "" : "border-dashed border-slate-300"
            )}
            style={{
                left: node.x,
                top: node.y,
            }}
            whileHover={{ scale: 1.05 }}
        >
            <div className="text-center">
                <div className="flex justify-center mb-1">
                    <Sparkles className={cn(
                        "w-5 h-5",
                        isFocused ? "text-cyan-500" : "text-slate-400"
                    )} />
                </div>
                <h3 className={cn(
                    "font-bold leading-tight",
                    isFocused ? "text-lg text-slate-900" : "text-sm text-slate-700"
                )}>
                    {node.label || "Define Identity"}
                </h3>
                {node.value?.industry && (
                    <p className="text-xs text-slate-500 mt-1 max-w-[120px] truncate">
                        {node.value.industry}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
