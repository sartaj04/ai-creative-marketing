'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

export function SystemBackground() {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
    const y2 = useTransform(scrollY, [0, 1000], [0, -150]);

    // Subtle mouse movement effect
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 w-full h-full -z-10 bg-slate-50 overflow-hidden pointer-events-none">
            {/* 1. Base Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-slate-100/80" />

            {/* 2. Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* 3. Noise Texture */}
            <div className="absolute inset-0 opacity-[0.4] mix-blend-overlay">
                <svg className="w-full h-full">
                    <filter id="noiseFilter">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.6"
                            stitchTiles="stitch"
                        />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                </svg>
            </div>

            {/* 4. Ambient Glows */}
            <motion.div
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-200/20 blur-[120px]"
                animate={{
                    x: mousePosition.x * 20,
                    y: mousePosition.y * 20,
                }}
                transition={{ type: 'tween', ease: 'linear', duration: 0.5 }}
            />
            <motion.div
                className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-200/20 blur-[120px]"
                animate={{
                    x: mousePosition.x * -20,
                    y: mousePosition.y * -20,
                }}
                transition={{ type: 'tween', ease: 'linear', duration: 0.5 }}
            />

            {/* 5. Floating System Elements (Abstract UI pieces) */}
            <motion.div
                style={{ y: y1 }}
                className="absolute top-[20%] right-[5%] w-64 h-48 border border-slate-200/60 rounded-xl bg-white/40 backdrop-blur-sm -rotate-6 opacity-30 shadow-lg"
            />
            <motion.div
                style={{ y: y2 }}
                className="absolute bottom-[20%] left-[2%] w-48 h-64 border border-slate-200/60 rounded-xl bg-white/40 backdrop-blur-sm rotate-3 opacity-30 shadow-lg"
            />

        </div>
    );
}
