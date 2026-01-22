"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import {
    Upload,
    Sparkles,
    ArrowLeft,
    ArrowRight,
    Check,
    AlertCircle,
    RefreshCw,
    Send,
    Image as ImageIcon,
    Code2,
    Eye,
    Edit2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    X,
    FileCode,
    Palette,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";

// Types
interface AIResult {
    template_id: string;
    html_code: string;
    css_code: string;
    suggested_name: string;
    suggested_description: string;
    suggested_industry: string;
    suggested_platform: string;
    suggested_objective: string;
    suggested_aspect_ratios: string[];
    detected_zones: any[];
    detected_variables: any[];
    layout_schema: any;
    source_type: string;
    source_url: string | null;
    analysis_notes: string;
    confidence_score: number;
}

interface BrandPreview {
    brand_id: string;
    brand_name: string;
    rendered_html: string;  // Complete HTML for iframe rendering
    colors_used: Record<string, string>;
    font_family: string;
    sample_content: Record<string, string>;
}

type Step = "upload" | "processing" | "review" | "preview";

export default function AITemplateCreatorPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [currentStep, setCurrentStep] = useState<Step>("upload");
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);
    const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<AIResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Feedback
    const [feedbackInput, setFeedbackInput] = useState("");
    const [feedbackHistory, setFeedbackHistory] = useState<{ text: string; timestamp: Date }[]>([]);

    // Brand previews
    const [brandPreviews, setBrandPreviews] = useState<BrandPreview[]>([]);
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

    // Editable metadata
    const [editedName, setEditedName] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [editedIndustry, setEditedIndustry] = useState("");
    const [editedPlatform, setEditedPlatform] = useState("");
    const [editedObjective, setEditedObjective] = useState("");

    // View mode for code
    const [showCode, setShowCode] = useState(false);

    // File drop handling
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
        const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "text/html"];
        const validExtensions = [".png", ".jpg", ".jpeg", ".webp", ".html", ".htm"];

        const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
        const isValid = validTypes.includes(file.type) || validExtensions.includes(extension);

        if (!isValid) {
            toast.error("Please upload an image (PNG, JPG, WebP) or HTML file");
            return;
        }

        setUploadedFile(file);
        setError(null);

        // Create preview for images
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setUploadPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setUploadPreview(null);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // Upload and process
    const handleStartProcessing = async () => {
        if (!uploadedFile) return;

        setIsUploading(true);
        setError(null);
        setCurrentStep("processing");

        try {
            const formData = new FormData();
            formData.append("file", uploadedFile);

            const response = await api.post("/admin/templates/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.data.status === "completed") {
                setTemplateId(response.data.template_id);
                // Fetch the full result
                const statusResponse = await api.get(`/admin/templates/${response.data.template_id}/ai-status`);
                if (statusResponse.data.result) {
                    const result = statusResponse.data.result;
                    setAiResult(result);
                    setEditedName(result.suggested_name);
                    setEditedDescription(result.suggested_description);
                    setEditedIndustry(result.suggested_industry);
                    setEditedPlatform(result.suggested_platform);
                    setEditedObjective(result.suggested_objective);
                    setCurrentStep("review");
                    toast.success("AI processing complete!");
                }
            } else if (response.data.status === "failed") {
                setError(response.data.message);
                setCurrentStep("upload");
                toast.error("Processing failed");
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Upload failed. Please try again.");
            setCurrentStep("upload");
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    // Submit feedback
    const handleSubmitFeedback = async () => {
        if (!feedbackInput.trim() || !templateId) return;

        setIsProcessingFeedback(true);
        const feedback = feedbackInput.trim();
        setFeedbackInput("");

        try {
            const response = await api.post(`/admin/templates/${templateId}/feedback`, {
                feedback,
            });

            setAiResult(response.data);
            setEditedName(response.data.suggested_name);
            setEditedDescription(response.data.suggested_description);
            setEditedIndustry(response.data.suggested_industry);
            setEditedPlatform(response.data.suggested_platform);
            setEditedObjective(response.data.suggested_objective);

            setFeedbackHistory([...feedbackHistory, { text: feedback, timestamp: new Date() }]);
            toast.success("Template updated based on feedback");
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to process feedback");
            setFeedbackInput(feedback); // Restore input on error
        } finally {
            setIsProcessingFeedback(false);
        }
    };

    // Load brand previews
    const handleLoadBrandPreviews = async () => {
        if (!templateId) return;

        setIsLoadingPreviews(true);
        setCurrentStep("preview");

        try {
            const response = await api.get(`/admin/templates/${templateId}/brand-previews`);
            setBrandPreviews(response.data.previews);
            setCurrentPreviewIndex(0);
            toast.success(`Generated ${response.data.total_brands} brand previews`);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to generate previews");
            setCurrentStep("review");
        } finally {
            setIsLoadingPreviews(false);
        }
    };

    // Accept and save
    const handleAcceptAndSave = async () => {
        if (!templateId) return;

        setIsSaving(true);

        try {
            await api.post(`/admin/templates/${templateId}/accept-ai`, {
                name: editedName,
                description: editedDescription,
                industry: editedIndustry,
                platform: editedPlatform,
                objective: editedObjective,
            });

            toast.success("Template saved! Redirecting to editor...");
            router.push(`/admin/templates/${templateId}`);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    // Reset
    const handleStartOver = () => {
        setCurrentStep("upload");
        setUploadedFile(null);
        setUploadPreview(null);
        setTemplateId(null);
        setAiResult(null);
        setError(null);
        setFeedbackInput("");
        setFeedbackHistory([]);
        setBrandPreviews([]);
        setCurrentPreviewIndex(0);
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
                                    AI Template Creator
                                </h1>
                                <p className="text-sm text-gray-500">Upload an image or HTML and let AI do the heavy lifting</p>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex items-center gap-2">
                            {["upload", "processing", "review", "preview"].map((step, index) => (
                                <div key={step} className="flex items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${currentStep === step
                                            ? "bg-primary-500 text-white"
                                            : ["upload", "processing", "review", "preview"].indexOf(currentStep) > index
                                                ? "bg-emerald-500 text-white"
                                                : "bg-gray-200 text-gray-500"
                                            }`}
                                    >
                                        {["upload", "processing", "review", "preview"].indexOf(currentStep) > index ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    {index < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Step 1: Upload */}
                    {currentStep === "upload" && (
                        <div className="max-w-2xl mx-auto">
                            <div
                                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${uploadedFile
                                    ? "border-primary-300 bg-primary-50"
                                    : "border-gray-300 bg-white hover:border-primary-400 hover:bg-gray-50"
                                    }`}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={handleUploadClick}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.webp,.html,.htm"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                />

                                {uploadedFile ? (
                                    <div className="space-y-4">
                                        {uploadPreview ? (
                                            <img
                                                src={uploadPreview}
                                                alt="Preview"
                                                className="max-h-64 mx-auto rounded-xl shadow-lg"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 mx-auto bg-primary-100 rounded-xl flex items-center justify-center">
                                                <FileCode className="w-12 h-12 text-primary-500" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-gray-900">{uploadedFile.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {(uploadedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setUploadedFile(null);
                                                setUploadPreview(null);
                                            }}
                                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Remove and choose another
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary-100 to-violet-100 rounded-2xl flex items-center justify-center">
                                            <Upload className="w-10 h-10 text-primary-500" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">
                                                Drop your template here
                                            </p>
                                            <p className="text-gray-500 mt-1">
                                                or click to browse
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <ImageIcon className="w-4 h-4" /> PNG, JPG, WebP
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className="flex items-center gap-1">
                                                <Code2 className="w-4 h-4" /> HTML
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-red-800">Processing Error</p>
                                        <p className="text-sm text-red-600 mt-1">{error}</p>
                                    </div>
                                </div>
                            )}

                            {uploadedFile && (
                                <div className="mt-6 flex justify-center">
                                    <button
                                        onClick={handleStartProcessing}
                                        disabled={isUploading}
                                        className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-violet-700 transition shadow-lg shadow-primary-500/25 disabled:opacity-50"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Process with AI
                                    </button>
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
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">AI is analyzing your template</h2>
                            <p className="text-gray-500">Extracting layout, detecting zones, generating code...</p>
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                                <span className="text-sm text-gray-600">This may take 10-30 seconds</span>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {currentStep === "review" && aiResult && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Preview & Code */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                        <h3 className="font-semibold text-gray-900">Generated Template</h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowCode(!showCode)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${showCode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                            >
                                                {showCode ? <Eye className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {showCode ? (
                                        <div className="p-4 space-y-4 max-h-[500px] overflow-auto">
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">HTML</p>
                                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-48">
                                                    {aiResult.html_code}
                                                </pre>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">CSS</p>
                                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-48">
                                                    {aiResult.css_code}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-gray-50">
                                            <div
                                                className="aspect-square max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden"
                                                dangerouslySetInnerHTML={{
                                                    __html: `<style>${aiResult.css_code}</style>${aiResult.html_code}`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Feedback Chat */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-gray-100">
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary-500" />
                                            Give Feedback
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Tell AI what to adjust. e.g., &quot;Make headline bigger&quot;, &quot;Change to healthcare style&quot;
                                        </p>
                                    </div>

                                    {feedbackHistory.length > 0 && (
                                        <div className="p-4 border-b border-gray-100 bg-gray-50 max-h-40 overflow-auto">
                                            {feedbackHistory.map((item, i) => (
                                                <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                                                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-primary-600">You</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 bg-white px-3 py-1.5 rounded-lg">
                                                        {item.text}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="p-4 flex gap-2">
                                        <input
                                            type="text"
                                            value={feedbackInput}
                                            onChange={(e) => setFeedbackInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && !isProcessingFeedback && handleSubmitFeedback()}
                                            placeholder="Type your feedback..."
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                            disabled={isProcessingFeedback}
                                        />
                                        <button
                                            onClick={handleSubmitFeedback}
                                            disabled={!feedbackInput.trim() || isProcessingFeedback}
                                            className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isProcessingFeedback ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Send className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Metadata */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Template Details</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={editedName}
                                                onChange={(e) => setEditedName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Description</label>
                                            <textarea
                                                value={editedDescription}
                                                onChange={(e) => setEditedDescription(e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Industry</label>
                                                <select
                                                    value={editedIndustry}
                                                    onChange={(e) => setEditedIndustry(e.target.value)}
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
                                                    <option value="local">Local</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Platform</label>
                                                <select
                                                    value={editedPlatform}
                                                    onChange={(e) => setEditedPlatform(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                                                >
                                                    <option value="general">General</option>
                                                    <option value="instagram">Instagram</option>
                                                    <option value="facebook">Facebook</option>
                                                    <option value="linkedin">LinkedIn</option>
                                                    <option value="twitter">Twitter</option>
                                                    <option value="meta_ads">Meta Ads</option>
                                                    <option value="google_ads">Google Ads</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Objective</label>
                                            <select
                                                value={editedObjective}
                                                onChange={(e) => setEditedObjective(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                                            >
                                                <option value="general">General</option>
                                                <option value="conversion">Conversion</option>
                                                <option value="awareness">Awareness</option>
                                                <option value="promotion">Promotion</option>
                                                <option value="engagement">Engagement</option>
                                                <option value="testimonial">Testimonial</option>
                                                <option value="announcement">Announcement</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Variables */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Detected Variables</h3>
                                    {aiResult.detected_variables.length === 0 ? (
                                        <p className="text-sm text-gray-500">No variables detected</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {aiResult.detected_variables.map((v: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                                    <span className="font-mono text-sm text-gray-700">{v.name}</span>
                                                    <span className="text-xs text-gray-400 uppercase">{v.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* AI Notes */}
                                <div className="bg-gradient-to-br from-primary-50 to-violet-50 rounded-2xl border border-primary-100 p-6">
                                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary-500" />
                                        AI Analysis
                                    </h3>
                                    <p className="text-sm text-gray-600">{aiResult.analysis_notes}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="h-2 flex-1 bg-white rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary-500 to-violet-500"
                                                style={{ width: `${aiResult.confidence_score * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600">
                                            {Math.round(aiResult.confidence_score * 100)}% confidence
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleLoadBrandPreviews}
                                        disabled={isLoadingPreviews}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-violet-700 transition shadow-lg shadow-primary-500/25 disabled:opacity-50"
                                    >
                                        {isLoadingPreviews ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Palette className="w-5 h-5" />
                                        )}
                                        Preview with Different Brands
                                    </button>
                                    <button
                                        onClick={handleAcceptAndSave}
                                        disabled={isSaving}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        Accept & Save Template
                                    </button>
                                    <button
                                        onClick={handleStartOver}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Start Over
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Brand Previews */}
                    {currentStep === "preview" && (
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <button
                                    onClick={() => setCurrentStep("review")}
                                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Review
                                </button>
                                <h2 className="text-xl font-bold text-gray-900">Brand Preview Carousel</h2>
                                <div />
                            </div>

                            {isLoadingPreviews ? (
                                <div className="text-center py-20">
                                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Rendering templates with different brand styles...</p>
                                </div>
                            ) : brandPreviews.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="relative">
                                        {/* Current Preview - Using iframe for HTML rendering */}
                                        <div className="h-[500px] bg-gray-100">
                                            {brandPreviews[currentPreviewIndex]?.rendered_html ? (
                                                <iframe
                                                    srcDoc={brandPreviews[currentPreviewIndex].rendered_html}
                                                    className="w-full h-full border-0"
                                                    title={brandPreviews[currentPreviewIndex].brand_name}
                                                    sandbox="allow-same-origin allow-scripts"
                                                    style={{ minHeight: '500px' }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-500">
                                                    <div className="text-center">
                                                        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                                                        <p>No preview available</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Navigation */}
                                        <button
                                            onClick={() => setCurrentPreviewIndex((i) => (i > 0 ? i - 1 : brandPreviews.length - 1))}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center hover:bg-white transition"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPreviewIndex((i) => (i < brandPreviews.length - 1 ? i + 1 : 0))}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center hover:bg-white transition"
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>
                                    </div>

                                    {/* Brand Info */}
                                    <div className="p-6 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {brandPreviews[currentPreviewIndex]?.brand_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {currentPreviewIndex + 1} of {brandPreviews.length} brand styles
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {Object.entries(brandPreviews[currentPreviewIndex]?.colors_used || {}).map(([key, color]) => (
                                                    <div
                                                        key={key}
                                                        className="w-8 h-8 rounded-lg shadow-inner border border-gray-200"
                                                        style={{ backgroundColor: color }}
                                                        title={`${key}: ${color}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thumbnail strip - show color swatches instead of images */}
                                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto">
                                        {brandPreviews.map((preview, index) => (
                                            <button
                                                key={preview.brand_id}
                                                onClick={() => setCurrentPreviewIndex(index)}
                                                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${index === currentPreviewIndex
                                                    ? "border-primary-500 ring-2 ring-primary-500/20"
                                                    : "border-transparent hover:border-gray-300"
                                                    }`}
                                            >
                                                {/* Color swatch thumbnail */}
                                                <div
                                                    className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                                                    style={{ backgroundColor: preview.colors_used.primary || '#666' }}
                                                >
                                                    {preview.brand_name.substring(0, 2).toUpperCase()}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">No previews generated</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-6 flex justify-center gap-4">
                                <button
                                    onClick={() => setCurrentStep("review")}
                                    className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Back to Edit
                                </button>
                                <button
                                    onClick={handleAcceptAndSave}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    Accept & Save Template
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
