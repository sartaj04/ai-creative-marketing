"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Instagram, Linkedin, Twitter, Monitor, Loader2, AlertCircle } from "lucide-react";

const PLATFORMS = [
    { id: "instagram", name: "Instagram", icon: Instagram, color: "from-pink-500 to-purple-500" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "from-blue-600 to-blue-800" },
    { id: "twitter", name: "Twitter/X", icon: Twitter, color: "from-gray-800 to-black" },
    { id: "google", name: "Google Ads", icon: Monitor, color: "from-green-500 to-blue-500" },
];

interface GeneratedCopy {
    headline: string;
    copy: string;
    cta: string;
    hashtags: string[];
    brand_name: string;
    brand_colors: string[];
}

export function DemoCreator() {
    const [url, setUrl] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState("instagram");
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedCopy, setGeneratedCopy] = useState<GeneratedCopy | null>(null);

    const handleGenerate = async () => {
        if (!url) return;

        setIsGenerating(true);
        setShowResult(false);
        setError(null);

        try {
            const response = await fetch("http://localhost:8000/api/v1/demo/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: url.startsWith("http") ? url : `https://${url}`,
                    platform: selectedPlatform,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate copy");
            }

            const data: GeneratedCopy = await response.json();
            setGeneratedCopy(data);
            setShowResult(true);
        } catch (err) {
            setError("Failed to generate. Please check the URL and try again.");
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const platform = PLATFORMS.find((p) => p.id === selectedPlatform);
    const output = generatedCopy;

    return (
        <section id="demo" className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Try It Now - No Signup Required
                    </h2>
                    <p className="text-xl text-gray-600">
                        Enter any website URL and see AI-generated marketing copy instantly
                    </p>
                </div>

                {/* Demo Interface */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    {/* Input Section */}
                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Website URL
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://your-website.com"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition text-gray-900"
                                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                            />
                        </div>
                        <div className="md:w-64">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Platform
                            </label>
                            <select
                                value={selectedPlatform}
                                onChange={(e) => {
                                    setSelectedPlatform(e.target.value);
                                    setShowResult(false);
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition bg-white text-gray-900"
                            >
                                {PLATFORMS.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:self-end">
                            <button
                                onClick={handleGenerate}
                                disabled={!url || isGenerating}
                                className="w-full md:w-auto gradient-primary text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate Ad
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {/* Platform Icons */}
                    <div className="flex gap-3 mb-8">
                        {PLATFORMS.map((p) => {
                            const Icon = p.icon;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPlatform(p.id);
                                        if (showResult && url) {
                                            handleGenerate();
                                        }
                                    }}
                                    className={`p-3 rounded-xl transition ${selectedPlatform === p.id
                                            ? `bg-gradient-to-r ${p.color} text-white shadow-lg`
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Result Section */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Generated Copy */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Generated Copy</h3>
                            <div className={`p-6 rounded-2xl transition-all duration-500 ${showResult && output
                                    ? "bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-100"
                                    : "bg-gray-50 border-2 border-gray-100"
                                }`}>
                                {showResult && output ? (
                                    <div className="space-y-4 animate-fade-in">
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 uppercase">Brand Detected</span>
                                            <p className="text-lg font-bold text-primary-600">{output.brand_name}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-primary-600 uppercase">Headline</span>
                                            <p className="text-xl font-bold text-gray-900">{output.headline}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-primary-600 uppercase">Copy</span>
                                            <p className="text-gray-700">{output.copy}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-primary-600 uppercase">CTA</span>
                                            <p className="text-primary-600 font-semibold">{output.cta}</p>
                                        </div>
                                        {output.hashtags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {output.hashtags.map((tag) => (
                                                    <span key={tag} className="text-sm text-secondary-600 bg-secondary-50 px-2 py-1 rounded-lg">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Enter a URL and click Generate to see the magic ✨</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview Card */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Ad Preview</h3>
                            <div className={`rounded-2xl overflow-hidden transition-all duration-500 ${showResult && output ? "shadow-2xl" : "shadow-lg opacity-50"
                                }`}>
                                <div
                                    className={`bg-gradient-to-br ${platform?.color} p-6 text-white min-h-[280px] flex flex-col justify-between`}
                                    style={showResult && output?.brand_colors?.[0] ? {
                                        background: `linear-gradient(135deg, ${output.brand_colors[0]} 0%, ${output.brand_colors[1] || output.brand_colors[0]} 100%)`
                                    } : undefined}
                                >
                                    {showResult && output ? (
                                        <>
                                            <div>
                                                <p className="text-2xl font-bold mb-4">{output.headline}</p>
                                                <p className="text-white/90 mb-4">{output.copy}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <button className="bg-white text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
                                                    {output.cta}
                                                </button>
                                                <div className="flex gap-1">
                                                    {output.hashtags.slice(0, 2).map((tag) => (
                                                        <span key={tag} className="text-xs text-white/70">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-white/50">
                                            <p className="text-lg">Your ad preview will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    {showResult && output && (
                        <div className="mt-8 text-center animate-slide-up">
                            <p className="text-gray-600 mb-4">
                                Like what you see? Sign up to generate unlimited creatives for <strong>{output.brand_name}</strong>!
                            </p>
                            <a
                                href="/register"
                                className="gradient-primary text-white px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center gap-2 hover:opacity-90 transition"
                            >
                                Start Creating Free
                                <ArrowRight className="w-5 h-5" />
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
