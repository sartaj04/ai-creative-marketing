"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ImageIcon,
    Download,
    Trash2,
    Filter,
    Grid3X3,
    List,
    Search,
    Instagram,
    Facebook,
    Linkedin,
    Twitter,
    Star,
    MoreHorizontal,
    CheckSquare,
    Square,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAssetStore } from "@/lib/stores/asset-store";
import { cn, getPlatformLabel, formatDate } from "@/lib/utils";
import { Platform, Asset } from "@/lib/types";
import { toast } from "sonner";

const platformIcons: Record<string, React.ElementType> = {
    instagram_feed: Instagram,
    instagram_story: Instagram,
    instagram_reel: Instagram,
    facebook: Facebook,
    linkedin: Linkedin,
    twitter: Twitter,
};

// Demo assets
const demoAssets: Asset[] = [
    {
        id: 1,
        user_id: 1,
        profile_id: 1,
        platform: "instagram_feed",
        aspect_ratio: "1:1",
        image_url: "",
        copy_text: { headline: "Summer Sale!", subheadline: "Up to 50% off", cta: "Shop Now", hashtags: [], language: "en" },
        status: "completed",
        created_at: "2024-01-15T10:00:00Z",
    },
    {
        id: 2,
        user_id: 1,
        profile_id: 1,
        platform: "facebook",
        aspect_ratio: "1.91:1",
        image_url: "",
        copy_text: { headline: "New Arrivals", subheadline: "Check out our latest", cta: "Explore", hashtags: [], language: "en" },
        status: "completed",
        created_at: "2024-01-14T10:00:00Z",
    },
    {
        id: 3,
        user_id: 1,
        profile_id: 1,
        platform: "linkedin",
        aspect_ratio: "1:1",
        image_url: "",
        copy_text: { headline: "Grow Your Business", subheadline: "With AI Marketing", cta: "Learn More", hashtags: [], language: "en" },
        status: "completed",
        created_at: "2024-01-13T10:00:00Z",
    },
];

export default function AssetsPage() {
    const {
        assets,
        selectedAssets,
        isLoading,
        fetchAssets,
        toggleAssetSelection,
        selectAll,
        clearSelection,
        deleteSelected,
        downloadSelected,
    } = useAssetStore();

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [platformFilter, setPlatformFilter] = useState<Platform | null>(null);
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

    const displayAssets = assets.length > 0 ? assets : demoAssets;

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const filteredAssets = displayAssets.filter((asset) => {
        if (platformFilter && asset.platform !== platformFilter) return false;
        if (
            searchQuery &&
            !asset.copy_text.headline.toLowerCase().includes(searchQuery.toLowerCase())
        )
            return false;
        return true;
    });

    const handleDownload = async () => {
        try {
            const url = await downloadSelected();
            window.open(url, "_blank");
            toast.success("Download started!");
        } catch (error) {
            toast.error("Download failed");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete selected assets?")) return;
        try {
            await deleteSelected();
            toast.success("Assets deleted");
        } catch {
            toast.error("Delete failed");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Assets</h1>
                    <p className="text-muted-foreground">
                        {filteredAssets.length} assets
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={cn(viewMode === "grid" && "bg-muted")}
                    >
                        <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={cn(viewMode === "list" && "bg-muted")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-2">
                    {(["instagram_feed", "facebook", "linkedin", "twitter"] as Platform[]).map(
                        (platform) => {
                            const Icon = platformIcons[platform] || ImageIcon;
                            const isActive = platformFilter === platform;
                            return (
                                <Button
                                    key={platform}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setPlatformFilter(isActive ? null : platform)
                                    }
                                    className={cn(isActive && "bg-primary text-primary-foreground")}
                                >
                                    <Icon className="h-4 w-4" />
                                </Button>
                            );
                        }
                    )}
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedAssets.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                        {selectedAssets.length} selected
                    </span>
                    <Button size="sm" variant="outline" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                        Clear
                    </Button>
                </div>
            )}

            {/* Asset Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                </div>
            ) : filteredAssets.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Generate your first campaign to see assets here
                        </p>
                        <Button asChild>
                            <a href="/dashboard/generate">Generate Now</a>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div
                    className={cn(
                        "grid gap-4",
                        viewMode === "grid"
                            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                            : "grid-cols-1"
                    )}
                >
                    {filteredAssets.map((asset, index) => {
                        const isSelected = selectedAssets.includes(asset.id);
                        const PlatformIcon = platformIcons[asset.platform] || ImageIcon;

                        return (
                            <motion.div
                                key={asset.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className={cn(
                                        "overflow-hidden cursor-pointer transition-all hover:shadow-md",
                                        isSelected && "ring-2 ring-primary"
                                    )}
                                >
                                    <div
                                        className="relative aspect-square bg-gradient-to-br from-primary/20 to-primary/5"
                                        onClick={() => setPreviewAsset(asset)}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                                        </div>

                                        {/* Selection checkbox */}
                                        <button
                                            className="absolute top-2 left-2 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAssetSelection(asset.id);
                                            }}
                                        >
                                            {isSelected ? (
                                                <CheckSquare className="h-5 w-5 text-primary" />
                                            ) : (
                                                <Square className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                                            )}
                                        </button>

                                        {/* Platform badge */}
                                        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                                            <PlatformIcon className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <CardContent className="p-3">
                                        <h4 className="font-medium text-sm truncate">
                                            {asset.copy_text.headline}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDate(asset.created_at)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Preview Modal */}
            <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{previewAsset?.copy_text.headline}</DialogTitle>
                    </DialogHeader>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-16 w-16 text-muted-foreground" />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Headline</label>
                                <p className="font-medium">{previewAsset?.copy_text.headline}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">
                                    Subheadline
                                </label>
                                <p>{previewAsset?.copy_text.subheadline}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">CTA</label>
                                <p>{previewAsset?.copy_text.cta}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Platform</label>
                                <p>{getPlatformLabel(previewAsset?.platform || "")}</p>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button className="flex-1">
                                    <Download className="h-4 w-4 mr-2" /> Download
                                </Button>
                                <Button variant="outline">Edit</Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
