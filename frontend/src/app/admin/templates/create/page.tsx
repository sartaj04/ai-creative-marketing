"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import {
    Upload,
    Sparkles,
    ArrowLeft,
    Check,
    AlertCircle,
    RefreshCw,
    Image as ImageIcon,
    Loader2,
    X,
    Search,
    Save,
    Eye,
    Code2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
    analyzeImage,
    analyzeText,
    renderPreview,
    searchUnsplash,
    getRandomUnsplashImage,
    type TemplateJSON,
    type UnsplashImage,
    type TextAnalyzeResponse,
} from "@/lib/render-service";
import { toast } from "sonner";

// Types
interface TemplateVariable {
    name: string;
    type: "text" | "image" | "color";
    value: string;
    required?: boolean;
}

type TemplateType = "post" | "carousel" | "text";
type Step = "upload" | "processing" | "edit";

export default function TemplateCreatePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step state
    const [currentStep, setCurrentStep] = useState<Step>("upload");
    const [templateType, setTemplateType] = useState<TemplateType>("post");
    const [inputMode, setInputMode] = useState<"file" | "text">("file");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Upload state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);

    // Text state
    const [inputText, setInputText] = useState("");
    const [extractedFormat, setExtractedFormat] = useState<TextAnalyzeResponse | null>(null);

    // Template state
    const [templateJson, setTemplateJson] = useState<TemplateJSON | null>(null);
    const [results, setResults] = useState<Record<string, {
        template?: TemplateJSON;
        slides?: any[];
        analysis: any;
        commonAnalysis?: any;
    }>>({});

    const [slides, setSlides] = useState<{
        page: number;
        template: TemplateJSON;
        analysis: any;
    }[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const [analysis, setAnalysis] = useState<{
        detectedElements: string[];
        colorPalette: string[];
        fonts: string[];
        hasBackgroundImage?: boolean;
    } | null>(null);

    // Selected ratios to generate
    const [selectedRatios, setSelectedRatios] = useState<string[]>(["1:1", "9:16", "16:9"]);

    // Variables state
    const [variables, setVariables] = useState<TemplateVariable[]>([]);

    // Metadata state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [industry, setIndustry] = useState("general");
    const [platform, setPlatform] = useState("general");
    const [objective, setObjective] = useState("general");
    const [aspectRatio, setAspectRatio] = useState<"1:1" | "9:16" | "16:9">("1:1");

    // UI state
    const [showUnsplashPicker, setShowUnsplashPicker] = useState(false);
    const [unsplashQuery, setUnsplashQuery] = useState("");
    const [unsplashResults, setUnsplashResults] = useState<UnsplashImage[]>([]);
    const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);

    // Dimensions based on aspect ratio
    const getDimensions = () => {
        switch (aspectRatio) {
            case "9:16":
                return { width: 1080, height: 1920 };
            case "16:9":
                return { width: 1920, height: 1080 };
            default:
                return { width: 1080, height: 1080 };
        }
    };

    // File handling
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, []);

    const handleFileSelect = (file: File) => {
        // Enforce type based on selected tab
        if (templateType === "post") {
            if (!file.type.startsWith("image/")) {
                toast.error("Please upload an image (PNG, JPG) for Single Post");
                return;
            }
        } else if (templateType === "carousel") {
            if (file.type !== "application/pdf") {
                toast.error("Please upload a PDF for Carousel");
                return;
            }
        }

        setUploadedFile(file);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            setUploadPreview(e.target?.result as string);
        };

        if (file.type.startsWith("image/")) {
            reader.readAsDataURL(file);
        } else {
            setUploadPreview(null);
        }
    };

    // Analyze text to extract format
    const handleTextExtract = async () => {
        if (!inputText.trim()) {
            toast.error("Please paste some text to analyze");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setCurrentStep("processing");

        try {
            const result = await analyzeText(inputText);
            if (result.success) {
                setExtractedFormat(result);
                setName(result.name);
                setDescription(result.description);
                // Map variables
                setVariables(result.variables.map(v => ({
                    name: v.name,
                    type: "text",
                    value: "",
                    required: true
                })));

                const textTemplate = {
                    type: "div",
                    props: { style: {} },
                    children: [result.format]
                } as any;

                // Initialize results for saving
                setResults({
                    "format": {
                        template: textTemplate,
                        analysis: {
                            detectedElements: result.variables.map(v => v.name),
                            colorPalette: [],
                            fonts: []
                        }
                    }
                });

                setTemplateJson(textTemplate);
                setCurrentStep("edit");
                toast.success("Format extracted!");
            }
        } catch (err: any) {
            setError(err.message || "Text extraction failed");
            setCurrentStep("upload");
            toast.error("Extraction failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Analyze image or PDF with render service for all selected aspect ratios
    const handleAnalyze = async () => {
        if (!uploadedFile) return;

        setIsAnalyzing(true);
        setError(null);
        setCurrentStep("processing");

        const ratioResults: Record<string, any> = {};
        const ratiosToProcess = selectedRatios.length > 0 ? selectedRatios : ["1:1"];

        try {
            // 1. Fetch random preview image for hydration
            const previewUnsplash = await getRandomUnsplashImage(industry !== "general" ? industry : "abstract");
            const previewImageUrl = previewUnsplash?.urls?.regular || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80";

            // 2. Parallel analysis for all ratios
            await Promise.all(ratiosToProcess.map(async (ratio) => {
                let width = 1080, height = 1080;
                if (ratio === "9:16") { width = 1080; height = 1920; }
                else if (ratio === "16:9") { width = 1920; height = 1080; }

                const result = await analyzeImage(uploadedFile, width, height);

                // Hydrate placeholders with Unsplash image
                if (result.template) {
                    result.template = hydrateTemplate(result.template, previewImageUrl);
                }
                if (result.slides) {
                    result.slides = result.slides.map(s => ({
                        ...s,
                        template: hydrateTemplate(s.template, previewImageUrl)
                    }));
                }

                ratioResults[ratio] = result;
            }));

            setResults(ratioResults);

            // Set initial view (first available ratio)
            const firstRatio = ratiosToProcess[0];
            const initialResult = ratioResults[firstRatio];
            setAspectRatio(firstRatio as any);

            if (templateType === "carousel" && initialResult.slides) {
                setSlides(initialResult.slides);
                setTemplateJson(initialResult.slides[0].template);
                setCurrentSlideIndex(0);
                setAnalysis({
                    detectedElements: initialResult.slides[0].analysis.detectedElements,
                    colorPalette: initialResult.commonAnalysis?.colorPalette || [],
                    fonts: initialResult.commonAnalysis?.fonts || [],
                });
            } else if (initialResult.template && initialResult.analysis) {
                setTemplateJson(initialResult.template);
                setAnalysis(initialResult.analysis);
            }

            // Extract variables
            const baseTemplate = initialResult.template || initialResult.slides?.[0]?.template;
            if (baseTemplate) {
                setVariables(extractVariables(baseTemplate));
            }

            const baseName = uploadedFile.name.replace(/\.[^/.]+$/, "");
            setName(baseName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

            setCurrentStep("edit");
            toast.success("Ready to preview!");

            if (baseTemplate) {
                await loadPreview(baseTemplate);
            }
        } catch (err: any) {
            setError(err.message || "Analysis failed");
            setCurrentStep("upload");
            toast.error("Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Helper to hydrate placeholders with real images for preview
    const hydrateTemplate = (template: TemplateJSON, imageUrl: string): TemplateJSON => {
        const jsonStr = JSON.stringify(template);
        // Replace {{image}} and {{background}} with the Unsplash URL
        const hydratedStr = jsonStr.replace(/\{\{image\}\}/g, imageUrl).replace(/\{\{background\}\}/g, imageUrl);
        return JSON.parse(hydratedStr);
    };


    // Extract variables from template JSON
    const extractVariables = (template: TemplateJSON): TemplateVariable[] => {
        const vars: TemplateVariable[] = [];
        const varPattern = /\{\{(\w+)\}\}/g;

        const scan = (node: any) => {
            if (typeof node === "string") {
                let match;
                while ((match = varPattern.exec(node)) !== null) {
                    const varName = match[1];
                    if (!vars.find((v) => v.name === varName)) {
                        vars.push({
                            name: varName,
                            type: varName.toLowerCase().includes("image") ? "image" : "text",
                            value: "",
                            required: true,
                        });
                    }
                }
            } else if (Array.isArray(node)) {
                node.forEach(scan);
            } else if (typeof node === "object" && node !== null) {
                Object.values(node).forEach(scan);
            }
        };

        scan(template);
        return vars;
    };

    // Load preview from render service
    const loadPreview = async (template: TemplateJSON) => {
        setIsLoadingPreview(true);
        try {
            const { width, height } = getDimensions();
            const result = await renderPreview(template, width, height);
            setPreviewImage(result.data);
        } catch (err: any) {
            console.error("Preview failed:", err);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    // Reload preview when template changes
    useEffect(() => {
        if (templateJson && currentStep === "edit") {
            const debounce = setTimeout(() => {
                loadPreview(templateJson);
            }, 500);
            return () => clearTimeout(debounce);
        }
    }, [templateJson, aspectRatio]);

    // Unsplash search
    const handleUnsplashSearch = async () => {
        if (!unsplashQuery.trim()) return;

        setIsSearchingUnsplash(true);
        try {
            const result = await searchUnsplash(unsplashQuery, {
                perPage: 12,
                orientation: aspectRatio === "9:16" ? "portrait" : aspectRatio === "16:9" ? "landscape" : "squarish",
            });
            setUnsplashResults(result.results);
        } catch (err: any) {
            toast.error("Failed to search images");
        } finally {
            setIsSearchingUnsplash(false);
        }
    };

    // Apply Unsplash background
    const handleSelectBackground = (image: UnsplashImage) => {
        if (!templateJson) return;

        // Update template with background image
        const updatedTemplate: TemplateJSON = {
            ...templateJson,
            props: {
                ...templateJson.props,
                style: {
                    ...templateJson.props.style,
                    backgroundImage: `url(${image.urls.regular})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                },
            },
        };

        if (templateType === "carousel") {
            const newSlides = [...slides];
            newSlides[currentSlideIndex].template = updatedTemplate;
            setSlides(newSlides);
        }

        setTemplateJson(updatedTemplate);
        setShowUnsplashPicker(false);
        toast.success("Background applied!");
    };

    // Save templates (Bulk for Multi-Ratio)
    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        setIsSaving(true);
        const savedIds: number[] = [];

        try {
            const ratiosToSave = Object.keys(results);

            await Promise.all(ratiosToSave.map(async (ratio) => {
                const result = results[ratio];
                const ratioName = ratiosToSave.length > 1 ? `${name.trim()} (${ratio})` : name.trim();

                const response = await api.post("/admin/templates/", {
                    name: ratioName,
                    description: description.trim(),
                    category: "ai-generated",
                    template_type: templateType,
                    industry,
                    platform,
                    objective,
                    format_type: "static",
                    aspect_ratios: [ratio],
                    variables: variables.map((v) => ({
                        name: v.name,
                        type: v.type,
                        required: v.required,
                    })),
                    layout_schema: templateType === "text" ? null : (templateType === "carousel" ? null : result.template),
                    slides_schema: templateType === "carousel" ? (result.slides || []).map((s: any) => s.template) : null,
                    html_code: templateType === "text" ? extractedFormat?.format || "" : "",
                    css_code: "",
                    slide_count: templateType === "carousel" ? (result.slides || []).length : 1,
                    extracted_colors: result.analysis?.colorPalette || analysis?.colorPalette || [],
                    extracted_fonts: result.analysis?.fonts || analysis?.fonts || [],
                });

                savedIds.push(response.data.id);
            }));

            toast.success(`${savedIds.length} templates saved successfully!`);
            router.push("/admin/templates");
        } catch (err: any) {
            console.error("Save error:", err);
            toast.error(err.response?.data?.detail || "Failed to save template(s)");
        } finally {
            setIsSaving(false);
        }
    };


    // Reset
    const handleReset = () => {
        setCurrentStep("upload");
        setUploadedFile(null);
        setUploadPreview(null);
        setTemplateJson(null);
        setPreviewImage(null);
        setAnalysis(null);
        setVariables([]);
        setName("");
        setDescription("");
        setError(null);

        // Comprehensive reset
        setResults({});
        setSlides([]);
        setCurrentSlideIndex(0);
        setInputText("");
        setExtractedFormat(null);
    };

    return (
        <AdminLayout>
            <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 to-slate-100">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/templates" className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-500" />
                                    Create Template
                                </h1>
                                <p className="text-sm text-gray-500">AI-powered layout extraction and multi-size adaptation</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {["upload", "processing", "edit"].map((step, index) => (
                                <div key={step} className="flex items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${currentStep === step
                                            ? "bg-primary-500 text-white"
                                            : ["upload", "processing", "edit"].indexOf(currentStep) > index
                                                ? "bg-emerald-500 text-white"
                                                : "bg-gray-200 text-gray-500"
                                            }`}
                                    >
                                        {["upload", "processing", "edit"].indexOf(currentStep) > index ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    {index < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Unified Input Step */}
                    {currentStep === "upload" && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2 font-outfit">AI Template Engine</h2>
                                <p className="text-gray-500">Upload a design or paste an interesting post to generate templates</p>
                            </div>

                            <div className="flex justify-center mb-8">
                                <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
                                    <button
                                        onClick={() => {
                                            setTemplateType("post");
                                            setInputMode("file");
                                            setUploadedFile(null);
                                            setError(null);
                                        }}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${templateType === "post" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                        Single Post
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTemplateType("carousel");
                                            setInputMode("file");
                                            setUploadedFile(null);
                                            setError(null);
                                        }}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${templateType === "carousel" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    >
                                        <Code2 className="w-5 h-5" />
                                        Carousel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTemplateType("text");
                                            setInputMode("text");
                                            setUploadedFile(null);
                                            setError(null);
                                        }}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${templateType === "text" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Text Post
                                    </button>
                                </div>
                            </div>

                            {inputMode === "file" ? (
                                <div className="max-w-2xl mx-auto">
                                    <div
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative group bg-white border-4 border-dashed border-gray-100 hover:border-primary-500/30 rounded-[3rem] p-16 transition-all cursor-pointer flex flex-col items-center text-center shadow-sm hover:shadow-2xl"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                        />

                                        <div className="w-24 h-24 bg-primary-50 rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                            <Upload className="w-10 h-10 text-primary-500" />
                                        </div>

                                        <h2 className="text-2xl font-bold text-gray-900 mb-4 font-outfit">
                                            {uploadedFile ? uploadedFile.name : (templateType === "carousel" ? "Upload Carousel PDF" : "Upload Single Post")}
                                        </h2>
                                        <p className="text-gray-500 text-lg mb-8 max-w-sm">
                                            {templateType === "carousel"
                                                ? "Drag and drop a PDF file (multi-page) to generate slides."
                                                : "Drag and drop an image (JPG, PNG) to generate a post."}
                                        </p>

                                        {uploadedFile && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAnalyze();
                                                }}
                                                className="px-12 py-4 bg-primary-600 text-white text-xl font-bold rounded-2xl shadow-xl shadow-primary-500/20 hover:scale-[1.05] active:scale-[0.98] transition-all flex items-center gap-3"
                                            >
                                                <Sparkles className="w-6 h-6" />
                                                Generate Template
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-3xl mx-auto">
                                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Paste an interesting post here... e.g., 'Busting 5 Common Myths About {Topic}...'"
                                            className="w-full h-80 p-6 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 resize-none text-gray-800 leading-relaxed font-outfit text-lg"
                                        />

                                        <div className="mt-8 flex justify-end">
                                            <button
                                                onClick={handleTextExtract}
                                                disabled={isAnalyzing || !inputText.trim()}
                                                className="px-12 py-4 bg-emerald-600 text-white text-xl font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.05] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-3"
                                            >
                                                {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                                Extract Format
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Aspect ratio selector (Output Formats) */}
                            <div className="max-w-4xl mx-auto mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary-500" />
                                    Output Formats (Optional)
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {(["1:1", "9:16", "16:9"] as const).map((ratio) => (
                                        <label
                                            key={ratio}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${selectedRatios.includes(ratio)
                                                ? "bg-white border-primary-500 shadow-sm"
                                                : "bg-gray-100 border-transparent opacity-60 hover:opacity-100"
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${selectedRatios.includes(ratio) ? "bg-primary-500" : "bg-gray-300"
                                                }`}>
                                                {selectedRatios.includes(ratio) && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedRatios.includes(ratio)}
                                                onChange={() => {
                                                    if (selectedRatios.includes(ratio)) {
                                                        // Allow unchecking all (optional)
                                                        setSelectedRatios(selectedRatios.filter(r => r !== ratio));
                                                    } else {
                                                        setSelectedRatios([...selectedRatios, ratio]);
                                                    }
                                                }}
                                            />
                                            <span className={`font-semibold ${selectedRatios.includes(ratio) ? "text-gray-900" : "text-gray-500"}`}>{ratio}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="max-w-4xl mx-auto mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-red-800">Error</p>
                                        <p className="text-sm text-red-600 mt-1">{error}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Processing */}
                    {currentStep === "processing" && (
                        <div className="max-w-md mx-auto text-center py-20">
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-violet-500 rounded-full animate-pulse opacity-20" />
                                <div className="absolute inset-2 bg-gradient-to-r from-primary-500 to-violet-500 rounded-full animate-spin opacity-30" />
                                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                                    <Sparkles className="w-12 h-12 text-primary-500 animate-pulse" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">AI is analyzing your image</h2>
                            <p className="text-gray-500">Extracting layout, detecting elements, generating template...</p>
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                                <span className="text-sm text-gray-600">This may take 10-30 seconds</span>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Edit */}
                    {currentStep === "edit" && templateJson && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Preview */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Preview panel */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <Eye className="w-4 h-4" />
                                                Preview
                                            </h3>

                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <Eye className="w-4 h-4" />
                                                Preview
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowUnsplashPicker(true)}
                                                className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                                            >
                                                <ImageIcon className="w-4 h-4 inline mr-1" />
                                                Visuals
                                            </button>
                                            <button
                                                onClick={() => templateJson && loadPreview(templateJson)}
                                                disabled={isLoadingPreview}
                                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${isLoadingPreview ? "animate-spin" : ""}`} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-gray-50 flex items-center justify-center min-h-[400px] flex-col relative">
                                        {isLoadingPreview ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                                                <p className="text-sm text-gray-400">Rendering preview...</p>
                                            </div>
                                        ) : templateType === "text" ? (
                                            <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                                                <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-4">
                                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                                    <span className="text-xs font-bold text-gray-300 ml-2 uppercase tracking-widest">Format Preview</span>
                                                </div>
                                                <div className="text-gray-800 whitespace-pre-wrap font-outfit leading-relaxed min-h-[300px]">
                                                    {extractedFormat?.format.split(/(\{[^}]+\})/).map((part, i) => {
                                                        if (part.startsWith("{") && part.endsWith("}")) {
                                                            return <span key={i} className="px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold">{part}</span>;
                                                        }
                                                        return part;
                                                    })}
                                                </div>
                                            </div>
                                        ) : previewImage ? (
                                            <div className="relative group/preview flex flex-col items-center">
                                                <img
                                                    src={previewImage}
                                                    alt="Template Preview"
                                                    className={`rounded-xl shadow-2xl transition-all duration-300 max-h-[600px] ${aspectRatio === "9:16" ? "aspect-[9/16]" : aspectRatio === "16:9" ? "aspect-[16/9]" : "aspect-square"
                                                        }`}
                                                />

                                                {/* Float Navigation Overlay for Carousel */}
                                                {templateType === "carousel" && slides.length > 1 && (
                                                    <div className="absolute inset-y-0 -left-16 -right-16 flex items-center justify-between pointer-events-none">
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const newIndex = Math.max(0, currentSlideIndex - 1);
                                                                setCurrentSlideIndex(newIndex);
                                                                const newTemplate = slides[newIndex].template;
                                                                setTemplateJson(newTemplate);
                                                                await loadPreview(newTemplate);
                                                            }}
                                                            disabled={currentSlideIndex === 0}
                                                            className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-auto hover:bg-gray-50 disabled:opacity-0 transition"
                                                        >
                                                            <ChevronLeft className="w-6 h-6 text-gray-600" />
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const newIndex = Math.min(slides.length - 1, currentSlideIndex + 1);
                                                                setCurrentSlideIndex(newIndex);
                                                                const newTemplate = slides[newIndex].template;
                                                                setTemplateJson(newTemplate);
                                                                await loadPreview(newTemplate);
                                                            }}
                                                            disabled={currentSlideIndex === slides.length - 1}
                                                            className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-auto hover:bg-gray-50 disabled:opacity-0 transition"
                                                        >
                                                            <ChevronRight className="w-6 h-6 text-gray-600" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 text-center">
                                                <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                                                <p>Preview will appear here</p>
                                            </div>
                                        )}

                                        {/* Page Indicator */}
                                        {templateType === "carousel" && slides.length > 0 && (
                                            <div className="mt-8 flex items-center gap-2">
                                                {slides.map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 transition-all rounded-full ${i === currentSlideIndex ? "w-8 bg-primary-500" : "w-1.5 bg-gray-300"
                                                            }`}
                                                    />
                                                ))}
                                                <span className="ml-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    Page {currentSlideIndex + 1} of {slides.length}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                </div>


                                {/* Analysis info */}
                                {analysis && (
                                    <div className="bg-gradient-to-br from-primary-50 to-violet-50 rounded-2xl border border-primary-100 p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary-500" />
                                            AI Analysis
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Elements</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {analysis.detectedElements.map((el, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-white rounded text-xs text-gray-600">
                                                            {el}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Colors</p>
                                                <div className="flex gap-1">
                                                    {analysis.colorPalette.slice(0, 5).map((color, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-6 h-6 rounded border border-gray-200"
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Fonts</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {analysis.fonts.map((font, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-white rounded text-xs text-gray-600">
                                                            {font}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Form */}
                            <div className="space-y-6">
                                {/* Metadata */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Template Details</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                                                Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                                placeholder="Template name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                                placeholder="Optional description"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                                                    Industry
                                                </label>
                                                <select
                                                    value={industry}
                                                    onChange={(e) => setIndustry(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                                                >
                                                    <option value="general">General</option>
                                                    <option value="ecommerce">E-commerce</option>
                                                    <option value="saas">SaaS</option>
                                                    <option value="healthcare">Healthcare</option>
                                                    <option value="food">Food</option>
                                                    <option value="realestate">Real Estate</option>
                                                    <option value="finance">Finance</option>
                                                    <option value="personal">Personal</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                                                    Platform
                                                </label>
                                                <select
                                                    value={platform}
                                                    onChange={(e) => setPlatform(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                                                >
                                                    <option value="general">General</option>
                                                    <option value="instagram">Instagram</option>
                                                    <option value="facebook">Facebook</option>
                                                    <option value="linkedin">LinkedIn</option>
                                                    <option value="twitter">Twitter</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                                                Objective
                                            </label>
                                            <select
                                                value={objective}
                                                onChange={(e) => setObjective(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                                            >
                                                <option value="general">General</option>
                                                <option value="conversion">Conversion</option>
                                                <option value="awareness">Awareness</option>
                                                <option value="promotion">Promotion</option>
                                                <option value="engagement">Engagement</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Variables */}
                                {variables.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4">Template Variables</h3>
                                        <div className="space-y-3">
                                            {variables.map((variable, index) => (
                                                <div key={variable.name} className="flex items-center gap-2">
                                                    <span className="font-mono text-sm text-gray-600 w-24 truncate">
                                                        {variable.name}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={variable.value}
                                                        onChange={(e) => {
                                                            const newVars = [...variables];
                                                            newVars[index].value = e.target.value;
                                                            setVariables(newVars);
                                                        }}
                                                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                                        placeholder={`Enter ${variable.name}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving || !name.trim()}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Save Template
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Start Over
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Unsplash Picker Modal */}
                {showUnsplashPicker && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h3 className="font-semibold text-gray-900">Choose Background Image</h3>
                                <button
                                    onClick={() => setShowUnsplashPicker(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={unsplashQuery}
                                        onChange={(e) => setUnsplashQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleUnsplashSearch()}
                                        placeholder="Search backgrounds..."
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                    />
                                    <button
                                        onClick={handleUnsplashSearch}
                                        disabled={isSearchingUnsplash}
                                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50"
                                    >
                                        {isSearchingUnsplash ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Search className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[50vh]">
                                {unsplashResults.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                                        <p>Search for background images</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {unsplashResults.map((image) => (
                                            <button
                                                key={image.id}
                                                onClick={() => handleSelectBackground(image)}
                                                className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition"
                                            >
                                                <img
                                                    src={image.urls.small}
                                                    alt={`Photo by ${image.user.name}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
