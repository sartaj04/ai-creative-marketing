"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { brandsApi } from "@/lib/api";
import { Plus, Globe, Palette, MoreVertical, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BrandProfile {
    id: string;
    name: string;
    website_url: string;
    logo_url?: string;
    profile_type: string;
    is_scraped: boolean;
    created_at: string;
}

export default function BrandsPage() {
    const [brands, setBrands] = useState<BrandProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBrands();
    }, []);

    async function fetchBrands() {
        try {
            const res = await brandsApi.list();
            setBrands(res.data || []);
        } catch (error) {
            toast.error("Failed to load brand profiles");
        } finally {
            setLoading(false);
        }
    }

    async function deleteBrand(id: string) {
        if (!confirm("Are you sure you want to delete this brand profile?")) return;

        try {
            await brandsApi.delete(id);
            setBrands(brands.filter(b => b.id !== id));
            toast.success("Brand profile deleted");
        } catch (error) {
            toast.error("Failed to delete brand profile");
        }
    }

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
                    <h1 className="text-3xl font-bold text-gray-900">Brand Profiles</h1>
                    <p className="text-gray-600 mt-1">Manage your brand identities and assets</p>
                </div>
                <Link
                    href="/dashboard/brands/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
                >
                    <Plus className="w-5 h-5" />
                    Add Brand
                </Link>
            </div>

            {/* Brands Grid */}
            {brands.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {brands.map((brand) => (
                        <div
                            key={brand.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
                        >
                            {/* Brand header */}
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {brand.logo_url ? (
                                            <img
                                                src={brand.logo_url}
                                                alt={brand.name}
                                                className="w-12 h-12 rounded-lg object-contain bg-gray-50"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                                                <Palette className="w-6 h-6 text-primary-500" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                                                {brand.profile_type}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <button className="p-1 hover:bg-gray-100 rounded">
                                            <MoreVertical className="w-5 h-5 text-gray-400" />
                                        </button>
                                        <div className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-lg border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                            <button
                                                onClick={() => deleteBrand(brand.id)}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {brand.website_url && (
                                    <a
                                        href={brand.website_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-500 mb-4"
                                    >
                                        <Globe className="w-4 h-4" />
                                        {brand.website_url.replace(/^https?:\/\//, "").split("/")[0]}
                                    </a>
                                )}

                                {/* Status */}
                                <div className="flex items-center gap-2">
                                    {brand.is_scraped ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            Assets extracted
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                            <RefreshCw className="w-3 h-3" />
                                            Pending extraction
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                <div className="flex gap-2">
                                    <Link
                                        href={`/dashboard/brands/${brand.id}`}
                                        className="flex-1 text-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                    >
                                        View Details
                                    </Link>
                                    <Link
                                        href={`/dashboard/generate?brand=${brand.id}`}
                                        className="flex-1 text-center px-4 py-2 text-sm text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition"
                                    >
                                        Generate
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No brand profiles yet</h3>
                    <p className="text-gray-500 mb-6">Create your first brand profile to start generating ads</p>
                    <Link
                        href="/dashboard/brands/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
                    >
                        <Plus className="w-5 h-5" />
                        Add Your First Brand
                    </Link>
                </div>
            )}
        </div>
    );
}
