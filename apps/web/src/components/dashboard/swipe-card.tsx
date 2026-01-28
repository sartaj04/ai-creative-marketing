"use client"

import { useState } from "react"
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion"
import { Check, X, Linkedin, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SwipeCardProps {
    data: {
        id: string
        title: string
        platform: "linkedin" | "blog" | "twitter"
        content: string
        tags: string[]
    }
    onSwipe: (direction: "left" | "right", id: string) => void
}

export function SwipeCard({ data, onSwipe }: SwipeCardProps) {
    const controls = useAnimation()
    const x = useMotionValue(0)

    // Rotation based on x position
    const rotate = useTransform(x, [-200, 200], [-10, 10])

    // Opacity of overlays
    const likeOpacity = useTransform(x, [50, 150], [0, 1])
    const rejectOpacity = useTransform(x, [-50, -150], [0, 1])
    const boxBorderColor = useTransform(x, [-150, 0, 150], ["#ef4444", "#e2e8f0", "#10b981"])

    const handleDragEnd = async (_: any, info: any) => {
        const offset = info.offset.x
        const velocity = info.velocity.x

        if (offset > 100 || velocity > 500) {
            await controls.start({ x: 500, opacity: 0 })
            onSwipe("right", data.id)
        } else if (offset < -100 || velocity < -500) {
            await controls.start({ x: -500, opacity: 0 })
            onSwipe("left", data.id)
        } else {
            controls.start({ x: 0 })
        }
    }

    return (
        <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={controls}
            style={{ x, rotate }}
            whileTap={{ cursor: "grabbing" }}
            className="absolute top-0 left-0 w-full max-w-md h-[500px] cursor-grab touch-pan-y"
        >
            <motion.div
                style={{ borderColor: boxBorderColor }}
                className="w-full h-full bg-white rounded-3xl shadow-xl border-2 overflow-hidden flex flex-col relative"
            >
                {/* Overlays */}
                <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 z-20 pointer-events-none">
                    <div className="border-4 border-emerald-500 rounded-lg px-4 py-2 transform -rotate-12 bg-white/80 backdrop-blur-sm">
                        <span className="text-3xl font-black text-emerald-600 uppercase tracking-widest">Approve</span>
                    </div>
                </motion.div>

                <motion.div style={{ opacity: rejectOpacity }} className="absolute top-8 right-8 z-20 pointer-events-none">
                    <div className="border-4 border-red-500 rounded-lg px-4 py-2 transform rotate-12 bg-white/80 backdrop-blur-sm">
                        <span className="text-3xl font-black text-red-500 uppercase tracking-widest">Reject</span>
                    </div>
                </motion.div>

                {/* Card Content */}
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className={`p-2 rounded-lg ${PlatformColors[data.platform].bg}`}>
                            {data.platform === 'linkedin' && <Linkedin className={`w-5 h-5 ${PlatformColors[data.platform].text}`} />}
                            {data.platform === 'blog' && <FileText className={`w-5 h-5 ${PlatformColors[data.platform].text}`} />}
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 py-1 bg-slate-100 rounded-full">
                            Draft
                        </span>
                    </div>

                    <h3 className="text-xl font-bold mb-4 leading-tight text-foreground">{data.title}</h3>

                    <div className="flex-1 relative overflow-hidden">
                        <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
                            {data.content}
                        </p>
                        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent" />
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                        {data.tags.map(tag => (
                            <span key={tag} className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="h-16 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between px-6">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Swipe or use keys <ArrowRight className="w-3 h-3" />
                    </p>
                    <Button variant="ghost" size="sm" className="text-primary font-semibold hover:text-primary hover:bg-primary/5">
                        Edit Draft
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    )
}

const PlatformColors = {
    linkedin: { bg: 'bg-[#0077b5]/10', text: 'text-[#0077b5]' },
    blog: { bg: 'bg-orange-500/10', text: 'text-orange-500' }, // Keeping internal logic, visually distinct
    twitter: { bg: 'bg-black/5', text: 'text-black' }
}
