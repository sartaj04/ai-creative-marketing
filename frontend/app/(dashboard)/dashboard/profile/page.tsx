"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Globe,
    Palette,
    Type,
    ImageIcon,
    ShoppingBag,
    Save,
    Plus,
    X,
    Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useProfileStore } from "@/lib/stores/profile-store";

export default function ProfilePage() {
    const { profiles, currentProfile, fetchProfiles, updateProfile } = useProfileStore();
    const [brandName, setBrandName] = useState("");
    const [colors, setColors] = useState<string[]>([]);
    const [newColor, setNewColor] = useState("#F97316");

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    useEffect(() => {
        if (currentProfile) {
            setBrandName(currentProfile.name);
            setColors(currentProfile.brand_assets?.colors?.map((c) => c.hex) || []);
        }
    }, [currentProfile]);

    const addColor = () => {
        if (!colors.includes(newColor)) {
            setColors([...colors, newColor]);
        }
    };

    const removeColor = (color: string) => {
        setColors(colors.filter((c) => c !== color));
    };

    const handleSave = async () => {
        if (!currentProfile) return;
        try {
            await updateProfile(currentProfile.id, {
                name: brandName,
                brand_assets: {
                    ...currentProfile.brand_assets,
                    colors: colors.map((hex) => ({ hex, type: "primary" })),
                },
            });
            toast.success("Profile updated!");
        } catch {
            toast.error("Update failed");
        }
    };

    const profile = currentProfile || profiles[0];

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Brand Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your brand assets and voice
                    </p>
                </div>
                <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
            </div>

            {/* Brand Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" /> Brand Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Brand Name</Label>
                        <Input
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="Your brand name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Website</Label>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-4 w-4" />
                            <span>{profile?.website_url || "Not set"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logo */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" /> Logo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                            {profile?.brand_assets?.logo ? (
                                <img
                                    src={profile.brand_assets.logo}
                                    alt="Logo"
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : (
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <Button variant="outline">
                                <Upload className="h-4 w-4 mr-2" /> Upload Logo
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                PNG or SVG, max 2MB
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Colors */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" /> Brand Colors
                    </CardTitle>
                    <CardDescription>
                        Colors extracted from your website
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        {colors.map((color) => (
                            <div
                                key={color}
                                className="relative group"
                            >
                                <div
                                    className="w-12 h-12 rounded-lg border shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                                <button
                                    onClick={() => removeColor(color)}
                                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className="w-12 h-12 rounded-lg cursor-pointer"
                            />
                            <Button variant="outline" size="sm" onClick={addColor}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products (E-commerce) */}
            {profile?.profile_type === "ecommerce" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5" /> Products
                        </CardTitle>
                        <CardDescription>
                            Products extracted from your store
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(profile.brand_assets?.products || []).slice(0, 8).map((product, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="aspect-square rounded-lg bg-muted overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium truncate">{product.name}</p>
                                    {product.price && (
                                        <p className="text-xs text-muted-foreground">{product.price}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Voice Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Type className="h-5 w-5" /> Voice Profile
                    </CardTitle>
                    <CardDescription>
                        AI-analyzed brand voice from your content
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tone</Label>
                            <p className="text-muted-foreground">
                                {profile?.voice_profile?.tone || "Professional, friendly"}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Style</Label>
                            <p className="text-muted-foreground">
                                {profile?.voice_profile?.style || "Modern, conversational"}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Keywords</Label>
                        <div className="flex flex-wrap gap-2">
                            {(profile?.voice_profile?.keywords || ["quality", "trust", "innovation"]).map(
                                (keyword, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 bg-muted rounded-full text-sm"
                                    >
                                        {keyword}
                                    </span>
                                )
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
