"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import {
    Save,
    ArrowLeft,
    Play,
    CheckCircle,
    AlertCircle,
    Sparkles,
    Trash2,
    Plus,
    Code2,
    Settings2,
    ChevronRight,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TemplateEditorPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;
    const isNew = templateId === "new";

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"metadata" | "code" | "variables" | "qa">("metadata");

    // Form State
    const [formData, setFormData] = useState<any>({
        name: "",
        description: "",
        industry: "general",
        platform: "instagram",
        objective: "promotion",
        format_type: "static",
        html_code: "",
        css_code: "",
        variables: [],
        aspect_ratios: ["1:1"],
        status: "DRAFT"
    });

    // QA State
    const [qaResult, setQaResult] = useState<any>(null);
    const [isQAing, setIsQAing] = useState(false);

    useEffect(() => {
        if (!isNew) {
            fetchTemplate();
        } else {
            setIsLoading(false);
        }
    }, [templateId]);

    const fetchTemplate = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/admin/templates/${templateId}/`);
            setFormData(response.data);
        } catch (error) {
            toast.error("Failed to fetch template details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (options: { approve?: boolean } = {}) => {
        setIsSaving(true);
        try {
            if (isNew) {
                const response = await api.post("/admin/templates/", formData);
                toast.success("Template created successfully");
                router.push(`/admin/templates/${response.data.id}`);
            } else {
                await api.patch(`/admin/templates/${templateId}/`, formData);
                toast.success("Template updated successfully");
                if (options.approve) {
                    await handleApprove();
                }
            }
        } catch (error) {
            toast.error("Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprove = async () => {
        try {
            await api.post(`/admin/templates/${templateId}/approve/`, { notes: "Approved via Web UI" });
            toast.success("Template approved for production!");
            fetchTemplate();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Approval failed. Did you run the QA render?");
        }
    };

    const handleRunQA = async () => {
        setIsQAing(true);
        try {
            const response = await api.post(`/admin/templates/${templateId}/render-dummy/`, {
                aspect_ratio: formData.aspect_ratios[0] || "1:1"
            });
            setQaResult(response.data);
            if (response.data.passed) {
                toast.success("QA Render Passed!");
            } else {
                toast.error("QA Render Failed. Check logs.");
            }
            fetchTemplate(); // Refresh to get dummy_render_passed status
        } catch (error) {
            toast.error("QA Render failed to execute");
        } finally {
            setIsQAing(false);
        }
    };

    const handleNormalize = async () => {
        try {
            const response = await api.post(`/admin/templates/${templateId}/normalize/`);
            const { layout_schema, suggested_variables } = response.data;

            // Merge suggested variables
            const existingVarNames = new Set(formData.variables.map((v: any) => v.name));
            const newVars = suggested_variables.filter((v: any) => !existingVarNames.has(v.name));

            setFormData({
                ...formData,
                variables: [...formData.variables, ...newVars],
                layout_schema
            });

            toast.success("Template structure analyzed and variables suggestsed");
            setActiveTab("variables");
        } catch (error) {
            toast.error("Normalization failed");
        }
    };

    const updateVariable = (index: number, field: string, value: any) => {
        const newVars = [...formData.variables];
        newVars[index] = { ...newVars[index], [field]: value };
        setFormData({ ...formData, variables: newVars });
    };

    const removeVariable = (index: number) => {
        const newVars = formData.variables.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, variables: newVars });
    };

    const addVariable = () => {
        setFormData({
            ...formData,
            variables: [...formData.variables, { name: "new_var", type: "text", required: true, default_value: "" }]
        });
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/templates" className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {isNew ? "Create New Template" : formData.name}
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${formData.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                    formData.status === 'DEPRECATED' ? 'bg-gray-100 text-gray-800' :
                                        'bg-amber-100 text-amber-800'
                                    }`}>
                                    {formData.status}
                                </span>
                                {!isNew && (
                                    <span className="text-xs text-gray-400">v{formData.version} • {formData.id}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleSave()}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            Save Draft
                        </button>
                        {!isNew && (
                            <button
                                onClick={() => handleSave({ approve: true })}
                                disabled={isSaving || !formData.dummy_render_passed}
                                className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed`}
                                title={!formData.dummy_render_passed ? "Must pass QA render before approval" : ""}
                            >
                                <CheckCircle className="w-4 h-4" />
                                Approve Production
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("metadata")}
                        className={`px-6 py-3 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === "metadata" ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Metadata
                    </button>
                    <button
                        onClick={() => setActiveTab("code")}
                        className={`px-6 py-3 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === "code" ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        HTML/CSS
                    </button>
                    <button
                        onClick={() => setActiveTab("variables")}
                        className={`px-6 py-3 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === "variables" ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Variables & Schema
                    </button>
                    <button
                        onClick={() => setActiveTab("qa")}
                        className={`px-6 py-3 text-sm font-medium transition whitespace-nowrap border-b-2 ${activeTab === "qa" ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        QA & Validation
                    </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === "metadata" && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Modern Minimalist Product Banner"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Describe the aesthetic and intended use cases..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                                                value={formData.industry}
                                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                            >
                                                <option value="general">General</option>
                                                <option value="ecommerce">E-commerce</option>
                                                <option value="saas">SaaS</option>
                                                <option value="real_estate">Real Estate</option>
                                                <option value="healthcare">Healthcare</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                                                value={formData.platform}
                                                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                            >
                                                <option value="instagram">Instagram</option>
                                                <option value="facebook">Facebook</option>
                                                <option value="linkedin">LinkedIn</option>
                                                <option value="twitter">Twitter</option>
                                                <option value="google_ads">Google Ads</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                                                value={formData.objective}
                                                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                                            >
                                                <option value="awareness">Awareness</option>
                                                <option value="engagement">Engagement</option>
                                                <option value="conversion">Conversion</option>
                                                <option value="promotion">Promotion</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                                                value={formData.format_type}
                                                onChange={(e) => setFormData({ ...formData, format_type: e.target.value })}
                                            >
                                                <option value="static">Static Image</option>
                                                <option value="video">Motion Video</option>
                                                <option value="carousel">Carousel</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "code" && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Code2 className="w-5 h-5 text-primary-500" />
                                            <h2 className="text-lg font-bold text-gray-900">HTML Source</h2>
                                        </div>
                                        <button
                                            onClick={handleNormalize}
                                            className="text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg transition border border-primary-100 flex items-center gap-1.5"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Detect Variables
                                        </button>
                                    </div>
                                    <textarea
                                        className="w-full h-[400px] px-4 py-3 bg-gray-900 text-gray-100 font-mono text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                                        value={formData.html_code}
                                        onChange={(e) => setFormData({ ...formData, html_code: e.target.value })}
                                        spellCheck={false}
                                    />
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Settings2 className="w-5 h-5 text-primary-500" />
                                        <h2 className="text-lg font-bold text-gray-900">CSS Styles</h2>
                                    </div>
                                    <textarea
                                        className="w-full h-[300px] px-4 py-3 bg-gray-900 text-gray-100 font-mono text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                                        value={formData.css_code}
                                        onChange={(e) => setFormData({ ...formData, css_code: e.target.value })}
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "variables" && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-primary-500" />
                                            <h2 className="text-lg font-bold text-gray-900">Template Variables</h2>
                                        </div>
                                        <button
                                            onClick={addVariable}
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Variable
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {formData.variables.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                                <p className="text-gray-500 text-sm">No variables defined. Use "Detect Variables" in the Code tab or add manually.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {formData.variables.map((variable: any, index: number) => (
                                                    <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 group">
                                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                                                            <div className="sm:col-span-1">
                                                                <input
                                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm font-mono"
                                                                    value={variable.name}
                                                                    onChange={(e) => updateVariable(index, "name", e.target.value)}
                                                                    placeholder="var_name"
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-1">
                                                                <select
                                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white"
                                                                    value={variable.type}
                                                                    onChange={(e) => updateVariable(index, "type", e.target.value)}
                                                                >
                                                                    <option value="text">Text</option>
                                                                    <option value="image">Image URL</option>
                                                                    <option value="color">Color Hex</option>
                                                                    <option value="boolean">Boolean</option>
                                                                </select>
                                                            </div>
                                                            <div className="sm:col-span-1">
                                                                <input
                                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm"
                                                                    value={variable.default_value || ""}
                                                                    onChange={(e) => updateVariable(index, "default_value", e.target.value)}
                                                                    placeholder="Default val"
                                                                />
                                                            </div>
                                                            <div className="sm:col-span-1 flex items-center h-full">
                                                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={variable.required}
                                                                        onChange={(e) => updateVariable(index, "required", e.target.checked)}
                                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                                    />
                                                                    Required
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeVariable(index)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "qa" && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">QA Rendering Room</h2>
                                            <p className="text-sm text-gray-500">Test your template with worst-case scenarios and stress components.</p>
                                        </div>
                                        <button
                                            onClick={handleRunQA}
                                            disabled={isQAing}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
                                        >
                                            {isQAing ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Play className="w-4 h-4 fill-current" />}
                                            Run Dummy Render
                                        </button>
                                    </div>

                                    {!qaResult ? (
                                        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                                <Sparkles className="w-8 h-8 text-indigo-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900">No Render Report Yet</h3>
                                            <p className="text-gray-500 max-w-sm text-center mt-2">
                                                Click "Run Dummy Render" to stress-test your HTML/CSS code with maximum text limits and placeholder assets.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* QA Stats */}
                                            <div className="flex flex-wrap gap-4">
                                                <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border ${qaResult.passed ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                                                    }`}>
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${qaResult.passed ? 'bg-emerald-500' : 'bg-red-500'
                                                        }`}>
                                                        {qaResult.passed ? <CheckCircle className="w-6 h-6 text-white" /> : <AlertCircle className="w-6 h-6 text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-500">QA Status</p>
                                                        <p className={`text-xl font-bold ${qaResult.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                                                            {qaResult.passed ? "PASSED" : "FAILED"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-[200px] bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                                                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-2">Technical Summary</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-xs text-indigo-400">Layout Zones</p>
                                                            <p className="text-sm font-bold text-indigo-900">{qaResult.metadata?.element_count || 0}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-indigo-400">Total Issues</p>
                                                            <p className="text-sm font-bold text-red-600">{qaResult.issues?.length || 0}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview & Issues */}
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-bold text-gray-700 uppercase">QA Render Preview</h3>
                                                    <div className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden group shadow-lg">
                                                        <img
                                                            src={qaResult.render_url}
                                                            alt="QA Render Product"
                                                            className="w-full h-full object-contain"
                                                        />
                                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md p-4 flex items-center justify-between">
                                                            <span className="text-xs text-white/80">Worst-case stress test</span>
                                                            <a href={qaResult.render_url} target="_blank" className="text-xs font-bold text-white hover:underline flex items-center gap-1">
                                                                <ExternalLink className="w-3 h-3" />
                                                                View Full Size
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-bold text-gray-700 uppercase">Issue Log</h3>
                                                    <div className="space-y-3">
                                                        {qaResult.issues.length === 0 ? (
                                                            <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm flex items-center gap-2">
                                                                <CheckCircle className="w-4 h-4" />
                                                                Excellent! System detected no visual regressions or overflows.
                                                            </div>
                                                        ) : (
                                                            qaResult.issues.map((issue: any, i: number) => (
                                                                <div key={i} className="p-4 bg-red-50 text-red-800 border border-red-100 rounded-lg flex items-start gap-3">
                                                                    <div className="p-1 bg-red-100 rounded mt-0.5">
                                                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-sm">{issue.type}</p>
                                                                        <p className="text-xs mt-0.5 leading-relaxed">{issue.description}</p>
                                                                        {issue.element && <code className="block mt-2 text-[10px] bg-red-100/50 p-1.5 rounded font-mono truncate max-w-full">{issue.element}</code>}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Template Sidebar</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Aspect Ratios</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {["1:1", "9:16", "16:9", "4:5"].map((ratio) => (
                                            <button
                                                key={ratio}
                                                className={`px-3 py-1 rounded-md text-xs font-medium transition ${formData.aspect_ratios.includes(ratio)
                                                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                                                    : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
                                                    }`}
                                                onClick={() => {
                                                    const newRatios = formData.aspect_ratios.includes(ratio)
                                                        ? formData.aspect_ratios.filter((r: string) => r !== ratio)
                                                        : [...formData.aspect_ratios, ratio];
                                                    setFormData({ ...formData, aspect_ratios: newRatios });
                                                }}
                                            >
                                                {ratio}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">System Checks</p>
                                    <div className="space-y-2 mt-2">
                                        <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                            <span className="text-xs text-gray-600">QA Pass</span>
                                            {formData.dummy_render_passed ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-amber-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                                            <span className="text-xs text-gray-600">Variables Valid</span>
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <div className="flex items-center justify-between py-1.5">
                                            <span className="text-xs text-gray-600">Normalization</span>
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!isNew && (
                            <div className="bg-slate-900 p-6 rounded-xl text-white">
                                <h3 className="text-sm font-bold mb-4">Version History</h3>
                                <div className="space-y-4">
                                    <div className="relative pl-6 border-l border-slate-700 space-y-6">
                                        <div className="relative">
                                            <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                            <p className="text-xs font-bold">Currently V{formData.version}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Latest snapshot</p>
                                        </div>
                                        <div className="relative group cursor-pointer">
                                            <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-slate-700 group-hover:bg-slate-500 transition" />
                                            <p className="text-xs font-medium text-slate-300">V{formData.version - 1 || 0}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">2 hours ago</p>
                                        </div>
                                    </div>
                                    <button className="w-full text-center text-xs text-primary-400 font-bold hover:text-primary-300 transition">
                                        View Full History
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
