"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    ArrowLeft,
    ArrowRight,
    Sparkles,
    Loader2,
    CheckCircle2,
    Instagram,
    Facebook,
    Linkedin,
    Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { useProfileStore } from "@/lib/stores/profile-store";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Platform } from "@/lib/types";

const campaignTypes = [
    { id: "general", label: "General Promotion" },
    { id: "sale", label: "Sale / Discount" },
    { id: "launch", label: "New Launch" },
    { id: "festival", label: "Festival Campaign" },
    { id: "awareness", label: "Brand Awareness" },
];

const platforms = [
    { id: "instagram_feed" as Platform, label: "Instagram Feed", icon: Instagram },
    { id: "instagram_story" as Platform, label: "Instagram Story", icon: Instagram },
    { id: "facebook" as Platform, label: "Facebook", icon: Facebook },
    { id: "linkedin" as Platform, label: "LinkedIn", icon: Linkedin },
    { id: "twitter" as Platform, label: "Twitter", icon: Twitter },
];

const languages = [
    { id: "en", label: "English" },
    { id: "hi", label: "Hindi" },
    { id: "ta", label: "Tamil" },
    { id: "bn", label: "Bengali" },
    { id: "ar", label: "Arabic" },
];

const festivals = [
    { id: "diwali", label: "Diwali" },
    { id: "eid", label: "Eid" },
    { id: "holi", label: "Holi" },
    { id: "christmas", label: "Christmas" },
    { id: "pongal", label: "Pongal" },
];

// Force dynamic rendering to avoid useSearchParams static generation error
export const dynamic = "force-dynamic";

function GeneratePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const profileId = searchParams.get("profile");

    const [step, setStep] = useState(1);
    const [campaignName, setCampaignName] = useState("");
    const [campaignType, setCampaignType] = useState("general");
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["instagram_feed"]);
    const [selectedLanguages, setSelectedLanguages] = useState(["en"]);
    const [selectedFestival, setSelectedFestival] = useState<string | null>(null);
    const [numVariants, setNumVariants] = useState(10);

    const { profiles, fetchProfiles, currentProfile, setCurrentProfile } = useProfileStore();
    const {
        jobId,
        status,
        progress,
        message: statusMessage,
        startGeneration,
        pollStatus,
        updateConfig,
        setProfileId,
        resetConfig,
    } = useGenerationStore();

    useEffect(() => {
        fetchProfiles();
        if (profileId) {
            setProfileId(parseInt(profileId));
        }
    }, [fetchProfiles, profileId, setProfileId]);

    useEffect(() => {
        if (jobId && status === "processing") {
            const interval = setInterval(pollStatus, 2000);
            return () => clearInterval(interval);
        }
        if (status === "completed") {
            toast.success("Generation complete!");
            router.push("/dashboard/assets");
        }
    }, [jobId, status, pollStatus, router]);

    const togglePlatform = (platform: Platform) => {
        setSelectedPlatforms((prev) =>
            prev.includes(platform)
                ? prev.filter((p) => p !== platform)
                : [...prev, platform]
        );
    };

    const toggleLanguage = (lang: string) => {
        setSelectedLanguages((prev) =>
            prev.includes(lang)
                ? prev.filter((l) => l !== lang)
                : [...prev, lang]
        );
    };

    const handleGenerate = async () => {
        if (!profileId && !currentProfile) {
            toast.error("Please select a brand profile");
            return;
        }

        updateConfig({
            campaign_type: campaignType,
            platforms: selectedPlatforms,
            aspect_ratios: ["1:1"],
            num_variants: numVariants,
            language: selectedLanguages[0],
            festival: selectedFestival || undefined,
        });

        setStep(4);

        try {
            await startGeneration();
        } catch (error) {
            toast.error("Failed to start generation");
            setStep(3);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Progress */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Generate Campaign</h1>
                    <span className="text-sm text-muted-foreground">
                        Step {step} of 4
                    </span>
                </div>
                <Progress value={(step / 4) * 100} />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    {/* Step 1: Campaign Info */}
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Campaign Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Campaign Name</Label>
                                    <Input
                                        placeholder="e.g., Diwali Sale 2024"
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Campaign Type</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {campaignTypes.map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setCampaignType(type.id)}
                                                className={cn(
                                                    "p-3 rounded-lg border text-left transition-all",
                                                    campaignType === type.id
                                                        ? "border-primary bg-primary/5"
                                                        : "hover:border-muted-foreground/30"
                                                )}
                                            >
                                                <span className="text-sm font-medium">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {campaignType === "festival" && (
                                    <div className="space-y-2">
                                        <Label>Festival</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {festivals.map((f) => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setSelectedFestival(f.id)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-sm transition-all",
                                                        selectedFestival === f.id
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted hover:bg-muted/80"
                                                    )}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button className="w-full" onClick={() => setStep(2)}>
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 2: Platforms */}
                    {step === 2 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Select Platforms</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {platforms.map((platform) => {
                                        const isSelected = selectedPlatforms.includes(platform.id);
                                        return (
                                            <button
                                                key={platform.id}
                                                onClick={() => togglePlatform(platform.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-4 rounded-lg border transition-all",
                                                    isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "hover:border-muted-foreground/30"
                                                )}
                                            >
                                                <platform.icon className={cn(
                                                    "h-5 w-5",
                                                    isSelected ? "text-primary" : "text-muted-foreground"
                                                )} />
                                                <span className="text-sm font-medium">{platform.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(1)}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        disabled={selectedPlatforms.length === 0}
                                        onClick={() => setStep(3)}
                                    >
                                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 3: Options */}
                    {step === 3 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Generation Options</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Languages</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.id}
                                                onClick={() => toggleLanguage(lang.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-sm transition-all",
                                                    selectedLanguages.includes(lang.id)
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted hover:bg-muted/80"
                                                )}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Number of Variants: {numVariants}</Label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        value={numVariants}
                                        onChange={(e) => setNumVariants(parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>5</span>
                                        <span>50</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(2)}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button className="flex-1" onClick={handleGenerate}>
                                        <Sparkles className="mr-2 h-4 w-4" /> Generate
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 4: Generating */}
                    {step === 4 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                {status === "completed" ? (
                                    <>
                                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                        <h2 className="text-2xl font-bold mb-2">Generation Complete!</h2>
                                        <p className="text-muted-foreground mb-6">
                                            Your creatives are ready to view
                                        </p>
                                        <Button asChild>
                                            <a href="/dashboard/assets">View Assets</a>
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                                        <h2 className="text-2xl font-bold mb-2">Generating...</h2>
                                        <p className="text-muted-foreground mb-6">
                                            {statusMessage || "Creating your marketing creatives"}
                                        </p>
                                        <Progress value={progress} className="max-w-md mx-auto" />
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {progress}% complete
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default function GeneratePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <GeneratePageContent />
        </Suspense>
    );
}

