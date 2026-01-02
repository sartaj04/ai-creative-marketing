"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    ShoppingBag,
    Building2,
    User,
    Globe,
    Loader2,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Palette,
    Type,
    Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api/client";
import { ProfileType } from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = [
    { id: 1, title: "Business Type" },
    { id: 2, title: "Website URL" },
    { id: 3, title: "Analyzing" },
    { id: 4, title: "Review" },
    { id: 5, title: "First Campaign" },
];

const segments = [
    {
        id: "ecommerce" as const,
        title: "E-commerce",
        description: "Shopify, WooCommerce, or any online store",
        icon: ShoppingBag,
        color: "from-orange-500 to-red-500",
    },
    {
        id: "saas" as const,
        title: "SaaS",
        description: "Software companies and web applications",
        icon: Building2,
        color: "from-blue-500 to-purple-500",
    },
    {
        id: "personal" as const,
        title: "Personal Brand",
        description: "Coaches, consultants, creators",
        icon: User,
        color: "from-green-500 to-teal-500",
    },
];

export default function OnboardPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [segment, setSegment] = useState<ProfileType | null>(null);
    const [url, setUrl] = useState("");
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [brandAssets, setBrandAssets] = useState<any>(null);
    const [profileId, setProfileId] = useState<number | null>(null);

    // Poll scraping status
    useEffect(() => {
        if (!jobId) return;

        const interval = setInterval(async () => {
            try {
                const status = await api.scrape.status(jobId);
                setProgress(status.progress || 0);
                setStatusMessage(status.message || "Processing...");

                if (status.status === "completed") {
                    clearInterval(interval);
                    setBrandAssets(status.result?.brand_assets);
                    setProfileId(status.result?.profile_id);
                    setCurrentStep(4);
                } else if (status.status === "failed") {
                    clearInterval(interval);
                    toast.error(status.error || "Scraping failed");
                    setCurrentStep(2);
                }
            } catch {
                // Continue polling
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [jobId]);

    const handleStartScrape = async () => {
        if (!segment || !url) return;

        try {
            setCurrentStep(3);
            setProgress(0);
            setStatusMessage("Initializing...");

            const response = await api.scrape.create(url, segment);
            setJobId(response.job_id);
            setProfileId(response.profile_id);
        } catch (error) {
            toast.error("Failed to start analysis");
            setCurrentStep(2);
        }
    };

    const handleComplete = () => {
        router.push("/dashboard/generate?profile=" + profileId);
    };

    const nextStep = () => {
        if (currentStep === 2) {
            handleStartScrape();
        } else {
            setCurrentStep((s) => Math.min(s + 1, 5));
        }
    };

    const prevStep = () => {
        setCurrentStep((s) => Math.max(s - 1, 1));
    };

    return (
        <div className="min-h-screen bg-muted/30 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Progress */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className={cn(
                                    "flex items-center",
                                    step.id < currentStep
                                        ? "text-primary"
                                        : step.id === currentStep
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                                        step.id < currentStep
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : step.id === currentStep
                                                ? "border-primary text-primary"
                                                : "border-muted-foreground/30"
                                    )}
                                >
                                    {step.id < currentStep ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                    ) : (
                                        step.id
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Progress value={(currentStep / 5) * 100} className="h-1" />
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Step 1: Segment Selection */}
                        {currentStep === 1 && (
                            <Card>
                                <CardContent className="p-8">
                                    <h2 className="text-2xl font-bold text-center mb-2">
                                        What type of business do you have?
                                    </h2>
                                    <p className="text-muted-foreground text-center mb-8">
                                        We'll customize your experience based on your industry
                                    </p>
                                    <div className="grid gap-4">
                                        {segments.map((seg) => (
                                            <button
                                                key={seg.id}
                                                onClick={() => setSegment(seg.id)}
                                                className={cn(
                                                    "flex items-center p-4 rounded-xl border-2 transition-all text-left",
                                                    segment === seg.id
                                                        ? "border-primary bg-primary/5"
                                                        : "border-muted hover:border-muted-foreground/30"
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center mr-4",
                                                        seg.color
                                                    )}
                                                >
                                                    <seg.icon className="h-6 w-6 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{seg.title}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {seg.description}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <Button
                                        className="w-full mt-6"
                                        disabled={!segment}
                                        onClick={nextStep}
                                    >
                                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 2: URL Input */}
                        {currentStep === 2 && (
                            <Card>
                                <CardContent className="p-8">
                                    <h2 className="text-2xl font-bold text-center mb-2">
                                        Enter your website URL
                                    </h2>
                                    <p className="text-muted-foreground text-center mb-8">
                                        We'll extract your brand assets, colors, and products
                                        automatically
                                    </p>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                type="url"
                                                placeholder="https://yourwebsite.com"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                className="pl-10 h-12 text-lg"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">
                                            Works with Shopify, WooCommerce, custom websites, and more
                                        </p>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button variant="outline" onClick={prevStep}>
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                        <Button className="flex-1" disabled={!url} onClick={nextStep}>
                                            Analyze Website <Sparkles className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Processing */}
                        {currentStep === 3 && (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
                                    <h2 className="text-2xl font-bold mb-2">
                                        Analyzing Your Brand
                                    </h2>
                                    <p className="text-muted-foreground mb-6">{statusMessage}</p>
                                    <Progress value={progress} className="mb-4" />
                                    <p className="text-sm text-muted-foreground">
                                        {progress}% complete
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 4 && (
                            <Card>
                                <CardContent className="p-8">
                                    <div className="flex items-center justify-center mb-6">
                                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-center mb-2">
                                        Brand Assets Extracted!
                                    </h2>
                                    <p className="text-muted-foreground text-center mb-8">
                                        We found the following from your website
                                    </p>

                                    <div className="space-y-6">
                                        {/* Logo */}
                                        {brandAssets?.logo && (
                                            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                                                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                                                    <img
                                                        src={brandAssets.logo}
                                                        alt="Logo"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium flex items-center">
                                                        <ImageIcon className="h-4 w-4 mr-2" /> Logo Detected
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        We'll use this in your creatives
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Colors */}
                                        {brandAssets?.colors?.length > 0 && (
                                            <div className="p-4 bg-muted rounded-lg">
                                                <h4 className="font-medium flex items-center mb-3">
                                                    <Palette className="h-4 w-4 mr-2" /> Brand Colors
                                                </h4>
                                                <div className="flex gap-2">
                                                    {brandAssets.colors.slice(0, 5).map((color: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            className="w-10 h-10 rounded-lg border"
                                                            style={{ backgroundColor: color.hex }}
                                                            title={color.hex}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Products */}
                                        {brandAssets?.products?.length > 0 && (
                                            <div className="p-4 bg-muted rounded-lg">
                                                <h4 className="font-medium flex items-center mb-3">
                                                    <ShoppingBag className="h-4 w-4 mr-2" />{" "}
                                                    {brandAssets.products.length} Products Found
                                                </h4>
                                                <div className="flex gap-2 overflow-x-auto">
                                                    {brandAssets.products.slice(0, 4).map((product: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            className="w-20 h-20 bg-white rounded-lg flex-shrink-0 overflow-hidden"
                                                        >
                                                            {product.image_url && (
                                                                <img
                                                                    src={product.image_url}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <Button className="w-full mt-6" onClick={nextStep}>
                                        Continue to Generate <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 5: First Campaign */}
                        {currentStep === 5 && (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Sparkles className="h-16 w-16 text-primary mx-auto mb-6" />
                                    <h2 className="text-2xl font-bold mb-2">
                                        You're All Set!
                                    </h2>
                                    <p className="text-muted-foreground mb-8">
                                        Your brand profile is ready. Let's create your first
                                        marketing campaign!
                                    </p>
                                    <Button size="lg" onClick={handleComplete}>
                                        Create First Campaign <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
