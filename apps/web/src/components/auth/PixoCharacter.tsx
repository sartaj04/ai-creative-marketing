'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

type ActionState = 'idle' | 'typing' | 'happy' | 'waving' | 'throwing';

export function PixoCharacter() {
    const [action, setAction] = useState<ActionState>('typing');
    const [isHovered, setIsHovered] = useState(false);
    const [hasRocket, setHasRocket] = useState(true);
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const actionRef = useRef<ActionState>(action);
    const isHoveredRef = useRef(isHovered);

    // Keep refs in sync
    useEffect(() => {
        actionRef.current = action;
    }, [action]);

    useEffect(() => {
        isHoveredRef.current = isHovered;
    }, [isHovered]);

    // Activity Tracking
    useEffect(() => {
        const handleActivity = () => {
            // User is moving/active - change from typing to idle
            if (actionRef.current === 'typing') {
                setAction('idle');
            }

            // Reset timer
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

            // Set new timer for inactivity (1.5 seconds)
            inactivityTimer.current = setTimeout(() => {
                if (!isHoveredRef.current && actionRef.current !== 'throwing') {
                    setAction('typing');
                }
            }, 1500);
        };

        // Only listen to actual user activity, don't trigger on mount
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('touchmove', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('touchmove', handleActivity);
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, []); // Empty dependency array - effect only runs once

    const handleThrow = async () => {
        if (action === 'throwing' || !hasRocket) return;

        setAction('throwing');

        // Wait for throw point
        setTimeout(() => {
            setHasRocket(false);

            // Reload rocket after a delay
            setTimeout(() => {
                setHasRocket(true);
                setAction('idle');
            }, 2000);
        }, 400);
    };

    return (
        <div
            className="relative w-28 h-28 sm:w-40 sm:h-40 md:w-56 md:h-56 lg:w-64 lg:h-64 flex items-end justify-center perspective-[1000px] cursor-pointer"
            onMouseEnter={() => {
                setIsHovered(true);
                if (action !== 'throwing') setAction('waving');
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                // If we were waving, go to idle. The inactivity timer will pick up typing eventually.
                if (action === 'waving') setAction('idle');
            }}
            onClick={handleThrow}
        >
            {/* Ambient Glow */}
            <motion.div
                animate={{
                    opacity: [0.15, 0.25, 0.15],
                    scale: [0.8, 1, 0.8],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="hidden sm:block absolute bottom-6 sm:bottom-8 md:bottom-10 w-24 h-6 sm:w-32 sm:h-8 md:w-40 md:h-10 bg-cyan-400/20 blur-2xl rounded-[100%]"
            />

            {/* Laptop (Only visible when typing) */}
            <AnimatePresence>
                {action === 'typing' && (
                    <motion.div
                        initial={{ scale: 0, y: 10, opacity: 0, rotateX: -90 }}
                        animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
                        exit={{ scale: 0, y: 10, opacity: 0, rotateX: -90 }}
                        transition={{ duration: 0.4, type: "spring" }}
                        className="absolute bottom-4 sm:bottom-6 md:bottom-8 z-30 flex flex-col items-center"
                    >
                        {/* Back of Laptop Lid (Facing Viewer) */}
                        <div className="w-14 h-10 sm:w-18 sm:h-12 md:w-24 md:h-16 bg-slate-300 rounded-lg border-2 border-slate-400 flex items-center justify-center relative shadow-lg">
                            {/* Favicon on lid */}
                            <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-6 md:h-6">
                                <Image
                                    src="/android-chrome-192x192.png"
                                    alt="Pixo Logo"
                                    fill
                                    className="object-contain rounded-lg"
                                />
                            </div>
                        </div>
                        {/* BaseEdge (hinge area) */}
                        <div className="w-14 sm:w-18 md:w-24 h-0.5 sm:h-1 bg-slate-400 rounded-full mt-[1px]" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Thrown Rocket Animation */}
            <AnimatePresence>
                {!hasRocket && action === 'throwing' && (
                    <motion.div
                        initial={{ x: 232, y: 46, scale: 1, rotate: 45 }}
                        animate={{ x: 528, y: -50, scale: 0.5, rotate: 45, opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute top-[128px] left-0 z-50 pointer-events-none"
                    >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 12L21.5 2L13 21.5L10 13L2.5 12Z" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pixo Body */}
            <motion.div
                className="relative z-20 w-20 h-16 sm:w-28 sm:h-24 md:w-36 md:h-32"
                animate={
                    action === 'happy' ? { y: [-10, -40, -10], scale: [1, 1.1, 0.9, 1] } :
                        action === 'typing' ? { y: 2 } :
                            action === 'throwing' ? { rotate: [-10, 10, -5, 0], x: [0, 10, 0] } :
                                { y: [0, -5, 0] } // idle floating
                }
                transition={
                    action === 'happy' ? { duration: 0.6, times: [0, 0.5, 0.8, 1] } :
                        action === 'typing' ? { duration: 0.3 } :
                            action === 'throwing' ? { duration: 0.5 } :
                                { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
            >
                {/* Main Shape - Soft Gradient Blob */}
                <div className="w-full h-full rounded-[40%] bg-gradient-to-b from-cyan-300 to-blue-500 shadow-lg shadow-cyan-500/30 relative overflow-hidden backdrop-blur-sm border-2 border-white/20">
                    {/* Glossy Highlight */}
                    <div className="absolute top-1 left-3 w-6 h-3 sm:top-1.5 sm:left-4 sm:w-8 sm:h-4 md:top-2 md:left-6 md:w-12 md:h-6 bg-white/30 rounded-full blur-[2px] transform -rotate-12" />

                    {/* Face */}
                    <div className="absolute top-5 sm:top-7 md:top-10 left-0 right-0 flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                        <div className="flex gap-3 sm:gap-4 md:gap-6 items-center">
                            {/* Left Eye */}
                            <motion.div
                                className="w-2 h-3 sm:w-2.5 sm:h-4 md:w-3.5 md:h-6 bg-slate-900 rounded-full"
                                animate={action === 'happy' ? { scaleY: [1, 0.1, 1], height: 4 } : { scaleY: [1, 0.1, 1] }}
                                transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.2 }}
                            />
                            {/* Right Eye */}
                            <motion.div
                                className="w-2 h-3 sm:w-2.5 sm:h-4 md:w-3.5 md:h-6 bg-slate-900 rounded-full"
                                animate={
                                    action === 'throwing' ? { scale: 1.2 } :
                                        action === 'happy' ? { scaleY: [1, 0.1, 1], height: 4 } :
                                            { scaleY: [1, 0.1, 1] }
                                }
                                transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.2 }}
                            />
                        </div>

                        {/* Cheeks */}
                        <div className="absolute top-2 sm:top-3 md:top-4 w-full flex justify-between px-3 sm:px-4 md:px-6 opacity-40">
                            <div className="w-1.5 h-1 sm:w-2 sm:h-1 md:w-3 md:h-1.5 bg-pink-400 rounded-full blur-[1px]" />
                            <div className="w-1.5 h-1 sm:w-2 sm:h-1 md:w-3 md:h-1.5 bg-pink-400 rounded-full blur-[1px]" />
                        </div>

                        {/* Mouth - Changes based on state */}
                        <motion.div
                            className="w-2 h-1 bg-slate-900 rounded-full opacity-60 mt-1"
                            animate={
                                action === 'waving' ? { scale: 1.5, width: 8, height: 4, borderRadius: '0 0 100% 100%' } :
                                    action === 'happy' ? { width: 10, height: 5, borderRadius: '0 0 100% 100%' } :
                                        action === 'throwing' ? { width: 6, height: 3, borderRadius: '0 0 100% 100%' } :
                                            { width: 4, height: 2 }
                            }
                        />
                    </div>
                </div>

                {/* Left Arm */}
                <motion.div
                    className="absolute top-8 -left-2 w-5 h-5 sm:top-10 sm:-left-2.5 sm:w-7 sm:h-7 md:top-14 md:-left-3 md:w-10 md:h-10 rounded-full bg-blue-400 border border-white/10 shadow-sm z-10"
                    animate={
                        action === 'waving' ? { rotate: [0, -20, 10, -20, 0], y: -5, x: -5 } :
                            action === 'typing' ? { x: 15, y: 15, rotate: -20, zIndex: 40 } :
                                action === 'throwing' ? { x: 10, rotate: 20 } :
                                    { rotate: 0 }
                    }
                    transition={
                        action === 'waving' ? { duration: 0.8, repeat: Infinity } :
                            action === 'typing' ? { duration: 0.3 } :
                                { duration: 0.5 }
                    }
                />

                {/* Right Arm (Action Arm) */}
                <motion.div
                    className="absolute top-8 -right-2 w-5 h-5 sm:top-10 sm:-right-2.5 sm:w-7 sm:h-7 md:top-14 md:-right-3 md:w-10 md:h-10 rounded-full bg-blue-400 border border-white/10 shadow-sm flex items-center justify-center z-30"
                    animate={
                        action === 'typing' ? { x: -15, y: 15, rotate: 20, zIndex: 40 } :
                            action === 'happy' ? { y: -15, rotate: -20 } :
                                action === 'throwing' ? {
                                    rotate: [0, -45, 60, 0],
                                    x: [0, -10, 20, 0],
                                    y: [0, -10, -10, 0]
                                } :
                                    { rotate: 0 }
                    }
                    transition={
                        action === 'typing' ? { duration: 0.3 } :
                            action === 'throwing' ? { duration: 0.6, times: [0, 0.4, 0.6, 1] } :
                                { duration: 0.5 }
                    }
                >
                    {/* Paper Rocket held in hand */}
                    <AnimatePresence>
                        {hasRocket && action !== 'typing' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="transform rotate-45"
                            >
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.5 12L21.5 2L13 21.5L10 13L2.5 12Z" fill="white" stroke="#0ea5e9" strokeWidth="1.5" strokeLinejoin="round" />
                                </svg>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Little Feet */}
                <div className="absolute -bottom-1 left-4 w-3 h-2.5 sm:-bottom-1.5 sm:left-6 sm:w-4 sm:h-3 md:-bottom-2 md:left-8 md:w-6 md:h-5 bg-blue-600 rounded-b-xl opacity-80" />
                <div className="absolute -bottom-1 right-4 w-3 h-2.5 sm:-bottom-1.5 sm:right-6 sm:w-4 sm:h-3 md:-bottom-2 md:right-8 md:w-6 md:h-5 bg-blue-600 rounded-b-xl opacity-80" />
            </motion.div>

            {/* Speech Bubble - Closer now */}
            <AnimatePresence>
                {(action !== 'typing' && action !== 'throwing') && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0, y: 5, x: -5 }}
                        animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            y: 0, 
                            x: 0,
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute top-[1.75rem] -right-[4.5rem] md:top-24 md:bottom-[unset] md:right-[unset] md:-right-8 bg-gradient-to-br from-white to-slate-50 text-slate-900 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl rounded-bl-none shadow-lg shadow-slate-200/50 border border-slate-200/60 z-40 origin-bottom-left backdrop-blur-sm"
                    >
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] md:text-xs font-semibold tracking-tight text-slate-800">
                                Hey there! 👋
                            </span>
                            <span className="text-[10px] md:text-xs font-medium tracking-tight text-slate-600 mt-0.5">
                                I'm Pixo
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Text Bubble (Typing etc) - Closer now */}
            <AnimatePresence>
                {action === 'typing' && (
                    <motion.div
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 2 }}
                        className="absolute top-[2.25rem] -right-[3rem] md:top-[unset] md:bottom-34 md:right-[unset] md:left-[52%] md:-translate-x-1/2 bg-slate-900/80 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full backdrop-blur-md whitespace-nowrap z-50"
                    >
                        <span className="text-[10px] md:text-xs font-medium flex items-center gap-1">
                            Working
                            <span className="flex gap-0.5">
                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}>.</motion.span>
                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}>.</motion.span>
                                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}>.</motion.span>
                            </span>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
