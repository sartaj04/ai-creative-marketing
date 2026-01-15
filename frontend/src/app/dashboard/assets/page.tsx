"use client";

import { useEffect, useState } from "react";
import { assetsApi } from "@/lib/api";
import { toast } from "sonner";
import {
    Image,
    Download,
    Trash2,
    Heart,
    Grid,
    List,
    Filter,
    Check,
} from "lucide-react";

interface Asset {
    id: string;
    image_url?: string;
    thumbnail_url?: string;
    platform: string;
    aspect_ratio: string;
    copy_text: {
        headline: string;
        cta: string;
    };
    is_favorite: boolean;
    created_at: string;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        fetchAssets();
    }, []);

    async function fetchAssets() {
        try {
            const res = await assetsApi.list();
            setAssets(res.data || []);
        } catch (error) {
            toast.error("Failed to load assets");
        } finally {
            setLoading(false);
        }
    }

    async function toggleFavorite(id: string) {
        try {
            await assetsApi.toggleFavorite(id);
            setAssets(assets.map(a =>
                a.id === id ? { ...a, is_favorite: !a.is_favorite } : a
            ));
        } catch (error) {
            toast.error("Failed to update favorite");
        }
    }

    async function deleteAsset(id: string) {
        if (!confirm("Delete this asset?")) return;
        try {
            await assetsApi.delete(id);
            setAssets(assets.filter(a => a.id !== id));
            toast.success("Asset deleted");
        } catch (error) {
            toast.error("Failed to delete asset");
        }
    }

    async function downloadAsset(id: string) {
        try {
            const res = await assetsApi.getDownloadUrl(id);
            window.open(res.data.download_url, "_blank");
        } catch (error) {
            toast.error("Failed to get download link");
        }
    }

    function toggleSelect(id: string) {
        if (selectedAssets.includes(id)) {
            setSelectedAssets(selectedAssets.filter(a => a !== id));
        } else {
            setSelectedAssets([...selectedAssets, id]);
        }
    }

    const filteredAssets = filter === "all"
        ? assets
        : filter === "favorites"
            ? assets.filter(a => a.is_favorite)
            : assets.filter(a => a.platform === filter);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
                    <p className="text-gray-600 mt-1">{assets.length} generated assets</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
                        >
                            <Grid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Filter */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg"
                    >
                        <option value="all">All Platforms</option>
                        <option value="favorites">⭐ Favorites</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">Twitter</option>
                        <option value="google_ads">Google Ads</option>
                    </select>

                    {/* Bulk actions */}
                    {selectedAssets.length > 0 && (
                        <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-lg">
                            <span className="text-sm text-primary-700">{selectedAssets.length} selected</span>
                            <button
                                onClick={() => toast.info("Bulk download coming soon")}
                                className="p-1 hover:bg-primary-100 rounded"
                            >
                                <Download className="w-4 h-4 text-primary-600" />
                            </button>
                            <button
                                onClick={() => setSelectedAssets([])}
                                className="text-xs text-primary-600 hover:text-primary-700"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Assets Grid */}
            {filteredAssets.length > 0 ? (
                <div className={viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    : "space-y-4"
                }>
                    {filteredAssets.map((asset) => (
                        <div
                            key={asset.id}
                            className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group ${selectedAssets.includes(asset.id) ? "ring-2 ring-primary-500" : ""
                                }`}
                        >
                            {/* Image */}
                            <div
                                className="relative aspect-square bg-gray-100 cursor-pointer"
                                onClick={() => toggleSelect(asset.id)}
                            >
                                {asset.thumbnail_url || asset.image_url ? (
                                    <img
                                        src={asset.thumbnail_url || asset.image_url}
                                        alt={asset.copy_text?.headline || "Asset"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Image className="w-12 h-12 text-gray-300" />
                                    </div>
                                )}

                                {/* Select checkbox */}
                                <div className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition ${selectedAssets.includes(asset.id)
                                        ? "bg-primary-500 border-primary-500"
                                        : "bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100"
                                    }`}>
                                    {selectedAssets.includes(asset.id) && <Check className="w-4 h-4 text-white" />}
                                </div>

                                {/* Favorite */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(asset.id);
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition"
                                >
                                    <Heart className={`w-4 h-4 ${asset.is_favorite ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
                                </button>

                                {/* Platform badge */}
                                <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded capitalize">
                                    {asset.platform.replace("_", " ")}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {asset.copy_text?.headline || "Untitled"}
                                </p>
                                <p className="text-xs text-gray-500">{asset.aspect_ratio}</p>
                            </div>

                            {/* Actions */}
                            <div className="px-3 pb-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={() => downloadAsset(asset.id)}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                                >
                                    <Download className="w-3 h-3" />
                                    Download
                                </button>
                                <button
                                    onClick={() => deleteAsset(asset.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No assets found</h3>
                    <p className="text-gray-500">
                        {filter !== "all"
                            ? "Try a different filter or generate new assets"
                            : "Generate your first creative to see it here"}
                    </p>
                </div>
            )}
        </div>
    );
}
