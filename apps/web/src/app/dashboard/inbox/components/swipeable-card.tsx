import { motion, useMotionValue, useTransform, PanInfo, useAnimation } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Check, X, Edit2, Linkedin, Twitter } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Draft } from '@/lib/api/drafts';
import { forwardRef, useImperativeHandle, useEffect } from 'react';

export interface SwipeableCardHandle {
    leaveScreen: (direction: 'left' | 'right') => Promise<void>;
}

interface SwipeableCardProps {
    draft: Draft;
    index: number;
    isFront: boolean;
    onSwipe: (direction: 'left' | 'right') => void;
    isActioning: boolean;
    onApprove?: (draft: Draft) => void;
    onReject?: (draft: Draft) => void;
    onEdit: (draft: Draft) => void;
}

export const SwipeableCard = forwardRef<SwipeableCardHandle, SwipeableCardProps>(({
    draft,
    index,
    isFront,
    onSwipe,
    isActioning,
}, ref) => {
    const x = useMotionValue(0);
    const controls = useAnimation();

    // Derived values for styling
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const bg = useTransform(x, [-200, 0, 200], ["rgba(239, 68, 68, 0.05)", "rgba(255,255,255,0)", "rgba(8, 145, 178, 0.05)"]);
    const approveOverlayOpacity = useTransform(x, [50, 150], [0, 1]);
    const rejectOverlayOpacity = useTransform(x, [-50, -150], [0, 1]);

    const confidencePercent = Math.round(draft.confidence * 100);

    // Sync stack animations (scale, y, opacity) when index changes
    useEffect(() => {
        controls.start({
            scale: 1 - index * 0.05,
            y: index * 15,
            opacity: index > 2 ? 0 : 1,
            transition: { duration: 0.3 }
        });
    }, [index, controls]);

    const leaveScreen = async (direction: 'left' | 'right') => {
        const targetX = direction === 'left' ? -1000 : 1000;

        // Disable drag while animating out
        await controls.start({
            x: targetX,
            opacity: 0,
            transition: { duration: 0.2, ease: "easeIn" }
        });

        onSwipe(direction);
    };

    useImperativeHandle(ref, () => ({
        leaveScreen
    }));

    const handleDragEnd = async (_event: any, info: PanInfo) => {
        if (isActioning) return;

        const threshold = 100;
        const velocity = info.velocity.x;

        if (info.offset.x > threshold || velocity > 500) {
            await leaveScreen('right');
        } else if (info.offset.x < -threshold || velocity < -500) {
            await leaveScreen('left');
        } else {
            // Snap back to center
            controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
        }
    };

    const getPlatformIcon = (platform: string | null) => {
        if (platform === 'linkedin') return <Linkedin className="w-5 h-5 text-[#0077b5]" />;
        if (platform === 'twitter') return <Twitter className="w-5 h-5 text-[#1DA1F2]" />;
        return <Edit2 className="w-5 h-5 text-slate-400" />;
    };

    const getPlatformLabel = (platform: string | null) => {
        if (platform === 'linkedin') return 'LinkedIn';
        if (platform === 'twitter') return 'Twitter';
        return 'Post';
    };

    // Calculate display body (remove hook if duplicated)
    const hookTrimmed = draft.hook.trim();
    const bodyTrimmed = draft.body?.trim() || '';
    const hookLower = hookTrimmed.toLowerCase();
    const bodyLower = bodyTrimmed.toLowerCase();
    const bodyStartsWithHook = hookLower && bodyLower.startsWith(hookLower);

    let displayBody = bodyTrimmed;
    if (bodyStartsWithHook && hookTrimmed) {
        displayBody = bodyTrimmed.substring(hookTrimmed.length).trim();
    }

    return (
        <motion.div
            style={{
                zIndex: 100 - index,
                x, // Bind motion value so drag works
                rotate: isFront ? rotate : 0,
                // These are controlled by controls.start in useEffect, but initial values help SSR/mount
                scale: 1 - index * 0.05,
                y: index * 15,
                opacity: index > 2 ? 0 : 1
            }}
            animate={controls} // Hand over control to animation controller
            drag={isFront && !isActioning ? "x" : false}
            // NO dragConstraints to allow flying off screen
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.95, opacity: 0, x: 0 }}
            whileHover={{ scale: isFront ? 1.02 : 1 - index * 0.05 }}
            transition={{ duration: 0.3 }}
            className="absolute w-full"
        >
            <Card className="h-[480px] sm:h-[550px] w-full shadow-2xl shadow-slate-200/50 border-0 sm:border sm:border-slate-100 flex flex-col overflow-hidden bg-white select-none cursor-grab active:cursor-grabbing rounded-3xl ring-1 ring-slate-900/5">
                {/* Card Header */}
                <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm flex-shrink-0">
                            {getPlatformIcon(draft.platform)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{draft.topic || 'Untitled Draft'}</h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 truncate">{getPlatformLabel(draft.platform)} &bull; {new Date(draft.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold border flex-shrink-0 ${confidencePercent > 90 ? 'bg-green-50 text-green-700 border-green-200' : confidencePercent > 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {confidencePercent}%
                    </div>
                </div>

                {/* Card Content - Scrollable */}
                <div className="px-8 py-4 sm:p-10 flex-1 flex flex-col bg-white overflow-y-auto overscroll-contain">
                    <div className="space-y-4 sm:space-y-6 flex-1 flex flex-col">
                        {hookTrimmed && (
                            <div className="pb-4 sm:pb-6 border-b border-slate-100">
                                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Hook</p>
                                <p className="text-slate-900 leading-relaxed text-lg sm:text-2xl font-bold">
                                    {hookTrimmed}
                                </p>
                            </div>
                        )}
                        {displayBody && (
                            <div className="flex-1">
                                <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Content</p>
                                <div className="text-slate-600 leading-relaxed text-sm sm:text-lg prose prose-slate max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => (
                                                <p className="mb-4 leading-relaxed">{children}</p>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="font-semibold text-slate-900">{children}</strong>
                                            ),
                                            em: ({ children }) => (
                                                <em className="italic">{children}</em>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="list-disc list-outside ml-6 mb-4 space-y-2">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">{children}</ol>
                                            ),
                                            li: ({ children }) => (
                                                <li className="leading-relaxed">{children}</li>
                                            ),
                                            h1: ({ children }) => (
                                                <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-4">{children}</h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="text-xl font-bold text-slate-900 mt-5 mb-3">{children}</h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">{children}</h3>
                                            ),
                                            blockquote: ({ children }) => (
                                                <blockquote className="border-l-4 border-cyan-500 pl-4 my-4 italic text-slate-600">{children}</blockquote>
                                            ),
                                            code: ({ children }) => (
                                                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800">{children}</code>
                                            ),
                                            pre: ({ children }) => (
                                                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                                            ),
                                            a: ({ href, children }) => (
                                                <a href={href} className="text-cyan-600 hover:text-cyan-700 underline" target="_blank" rel="noopener noreferrer">{children}</a>
                                            ),
                                            hr: () => <hr className="my-6 border-slate-200" />,
                                        }}
                                    >
                                        {displayBody}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4 sm:pt-6 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                            {draft.format}
                        </span>
                        {draft.topic && (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium truncate max-w-[200px]">
                                #{draft.topic}
                            </span>
                        )}
                    </div>
                </div>

                {/* Action Hints Overlay - Only show on front card */}
                {isFront && (
                    <>
                        <motion.div style={{ opacity: approveOverlayOpacity }} className="absolute inset-0 bg-cyan-500/90 flex flex-col items-center justify-center text-white z-20 pointer-events-none">
                            <Check className="w-16 h-16 sm:w-20 sm:h-20 mb-2 sm:mb-4" />
                            <span className="text-xl sm:text-2xl font-bold tracking-wide uppercase">Approve</span>
                        </motion.div>
                        <motion.div style={{ opacity: rejectOverlayOpacity }} className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center text-white z-20 pointer-events-none">
                            <X className="w-16 h-16 sm:w-20 sm:h-20 mb-2 sm:mb-4" />
                            <span className="text-xl sm:text-2xl font-bold tracking-wide uppercase">Reject</span>
                        </motion.div>
                    </>
                )}
            </Card>
        </motion.div>
    );
});

SwipeableCard.displayName = 'SwipeableCard';
