"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { brandsApi, generationApi, templatesApi } from "@/lib/api";
import { toast } from "sonner";
import {
    Sparkles,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Copy,
    Check,
    Download,
    RefreshCw,
} from "lucide-react";

type Step = "brand" | "campaign" | "copy" | "templates" | "preview";

interface CopyVariant {
    headline: string;
    subheadline?: string;
    body: string;
    cta: string;
    hashtags?: string[];
}

export default function GeneratePage() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<Step>("brand");
    const [brands, setBrands] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Form state
    const [selectedBrand, setSelectedBrand] = useState<string>("");
    const [campaignType, setCampaignType] = useState("sale");
    const [festival, setFestival] = useState("");
    const [language, setLanguage] = useState("en");
    const [copies, setCopies] = useState<CopyVariant[]>([]);
    const [selectedCopy, setSelectedCopy] = useState<number>(0);
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [brandsRes, templatesRes] = await Promise.all([
                    brandsApi.list(),
                    templatesApi.list(),
                ]);
                setBrands(brandsRes.data || []);
                setTemplates(templatesRes.data || []);

                // Pre-select brand from URL
                const urlBrand = searchParams.get("brand");
                if (urlBrand) {
                    setSelectedBrand(urlBrand);
                    setStep("campaign");
                }
            } catch (error) {
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [searchParams]);

    async function generateCopy() {
        if (!selectedBrand) {
            toast.error("Please select a brand first");
            return;
        }

        setGenerating(true);
        try {
            const res = await generationApi.generateCopy({
                profile_id: selectedBrand,
                campaign_type: campaignType,
                festival: festival || undefined,
                language,
                num_variants: 10,
            });
            setCopies(res.data || []);
            setStep("copy");
            toast.success("Copy generated successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to generate copy");
        } finally {
            setGenerating(false);
        }
    }

    function copyToClipboard(text: string, index: number) {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast.success("Copied to clipboard!");
    }

    const steps: { key: Step; label: string }[] = [
        { key: "brand", label: "Select Brand" },
        { key: "campaign", label: "Campaign" },
        { key: "copy", label: "Copy" },
        { key: "templates", label: "Templates" },
        { key: "preview", label: "Preview" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.key === step);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Generate Creatives</h1>
                <p className="text-gray-600 mt-1">Create stunning marketing assets with AI</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((s, i) => (
                        <div key={s.key} className="flex items-center">
                            <button
                                onClick={() => i < currentStepIndex && setStep(s.key)}
                                disabled={i > currentStepIndex}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${step === s.key
                                        ? "bg-primary-500 text-white"
                                        : i < currentStepIndex
                                            ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
                                            : "bg-gray-100 text-gray-400"
                                    }`}
                            >
                                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                    {i + 1}
                                </span>
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                            {i < steps.length - 1 && (
                                <ChevronRight className="w-5 h-5 text-gray-300 mx-2" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {/* Step 1: Select Brand */}
                {step === "brand" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Select a brand profile</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {brands.map((brand) => (
                                <button
                                    key={brand.id}
                                    onClick={() => {
                                        setSelectedBrand(brand.id);
                                        setStep("campaign");
                                    }}
                                    className={`p-4 border-2 rounded-xl text-left transition ${selectedBrand === brand.id
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-gray-200 hover:border-primary-300"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {brand.logo_url ? (
                                            <img src={brand.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                {brand.name[0]}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-900">{brand.name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{brand.profile_type}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Campaign Type */}
                {step === "campaign" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Campaign Type</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: "sale", label: "Sale / Discount" },
                                    { value: "new_arrival", label: "New Arrival" },
                                    { value: "festival", label: "Festival" },
                                    { value: "general", label: "General Promo" },
                                ].map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => setCampaignType(type.value)}
                                        className={`p-4 border-2 rounded-xl transition ${campaignType === type.value
                                                ? "border-primary-500 bg-primary-50"
                                                : "border-gray-200 hover:border-primary-300"
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {campaignType === "festival" && (
                            <div>
                                <h3 className="text-lg font-medium mb-3">Select Festival</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: "diwali", label: "Diwali 🪔" },
                                        { value: "eid", label: "Eid 🌙" },
                                        { value: "holi", label: "Holi 🎨" },
                                        { value: "pongal", label: "Pongal 🌾" },
                                        { value: "onam", label: "Onam 🌸" },
                                        { value: "dussehra", label: "Dussehra 🏹" },
                                    ].map((f) => (
                                        <button
                                            key={f.value}
                                            onClick={() => setFestival(f.value)}
                                            className={`p-3 border-2 rounded-lg text-sm transition ${festival === f.value
                                                    ? "border-primary-500 bg-primary-50"
                                                    : "border-gray-200 hover:border-primary-300"
                                                }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-medium mb-3">Language</h3>
                            <div className="flex gap-3">
                                {[
                                    { value: "en", label: "English" },
                                    { value: "hi", label: "Hindi" },
                                    { value: "ta", label: "Tamil" },
                                ].map((lang) => (
                                    <button
                                        key={lang.value}
                                        onClick={() => setLanguage(lang.value)}
                                        className={`px-4 py-2 border-2 rounded-lg transition ${language === lang.value
                                                ? "border-primary-500 bg-primary-50"
                                                : "border-gray-200 hover:border-primary-300"
                                            }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={generateCopy}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition disabled:opacity-50"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating with AI...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate Copy
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Step 3: Copy Selection */}
                {step === "copy" && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Select Copy Variant</h2>
                            <button
                                onClick={generateCopy}
                                className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Regenerate
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                            {copies.map((copy, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedCopy(index)}
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition ${selectedCopy === index
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-gray-200 hover:border-primary-300"
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 mb-1">{copy.headline}</h4>
                                            {copy.subheadline && (
                                                <p className="text-sm text-gray-600 mb-2">{copy.subheadline}</p>
                                            )}
                                            <p className="text-sm text-gray-700">{copy.body}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                                    {copy.cta}
                                                </span>
                                                {copy.hashtags && (
                                                    <span className="text-xs text-gray-500">
                                                        {copy.hashtags.join(" ")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(
                                                    `${copy.headline}\n\n${copy.body}\n\n${copy.cta}\n\n${copy.hashtags?.join(" ") || ""}`,
                                                    index
                                                );
                                            }}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                                        >
                                            {copiedIndex === index ? (
                                                <Check className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Copy className="w-5 h-5 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setStep("campaign")}
                                className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Back
                            </button>
                            <button
                                onClick={() => setStep("templates")}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition"
                            >
                                Continue to Templates
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Templates */}
                {step === "templates" && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Choose Templates</h2>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        if (selectedTemplates.includes(template.id)) {
                                            setSelectedTemplates(selectedTemplates.filter(t => t !== template.id));
                                        } else {
                                            setSelectedTemplates([...selectedTemplates, template.id]);
                                        }
                                    }}
                                    className={`relative p-4 border-2 rounded-xl transition ${selectedTemplates.includes(template.id)
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-gray-200 hover:border-primary-300"
                                        }`}
                                >
                                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                                        {template.thumbnail_url ? (
                                            <img src={template.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <span className="text-gray-400">{template.name[0]}</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{template.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{template.category}</p>

                                    {selectedTemplates.includes(template.id) && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep("copy")}
                                className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Back
                            </button>
                            <button
                                onClick={() => setStep("preview")}
                                disabled={selectedTemplates.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition disabled:opacity-50"
                            >
                                Generate Assets
                                <Sparkles className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Preview */}
                {step === "preview" && (
                    <div className="text-center py-12">
                        <Sparkles className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Generating your assets...
                        </h2>
                        <p className="text-gray-600 mb-6">
                            This will create {selectedTemplates.length} template(s) with your selected copy.
                        </p>
                        <p className="text-sm text-gray-500">
                            Your assets will appear in the Assets tab when ready.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
