"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutTemplate, ShoppingBag, Building2, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Demo templates
const templates = [
    {
        id: 1,
        name: "Product Showcase",
        segment: "ecommerce",
        category: "product",
        description: "Split layout with product on left",
        thumbnail: null,
        is_premium: false,
    },
    {
        id: 2,
        name: "Sale Banner",
        segment: "ecommerce",
        category: "sale",
        description: "Bold sale announcement",
        thumbnail: null,
        is_premium: false,
    },
    {
        id: 3,
        name: "Feature Highlight",
        segment: "saas",
        category: "feature",
        description: "Gradient background with features",
        thumbnail: null,
        is_premium: false,
    },
    {
        id: 4,
        name: "Testimonial Card",
        segment: "saas",
        category: "testimonial",
        description: "Customer quote with avatar",
        thumbnail: null,
        is_premium: true,
    },
    {
        id: 5,
        name: "Quote Card",
        segment: "personal",
        category: "quote",
        description: "Elegant quote for thought leadership",
        thumbnail: null,
        is_premium: false,
    },
    {
        id: 6,
        name: "Tip Carousel",
        segment: "personal",
        category: "tips",
        description: "Multi-slide tip format",
        thumbnail: null,
        is_premium: true,
    },
];

const segmentIcons = {
    all: LayoutTemplate,
    ecommerce: ShoppingBag,
    saas: Building2,
    personal: User,
};

export default function TemplatesPage() {
    const [selectedSegment, setSelectedSegment] = useState("all");

    const filteredTemplates =
        selectedSegment === "all"
            ? templates
            : templates.filter((t) => t.segment === selectedSegment);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Templates</h1>
                <p className="text-muted-foreground">
                    Choose a template to start your campaign
                </p>
            </div>

            {/* Segment Tabs */}
            <Tabs value={selectedSegment} onValueChange={setSelectedSegment}>
                <TabsList>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        All
                    </TabsTrigger>
                    <TabsTrigger value="ecommerce" className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        E-commerce
                    </TabsTrigger>
                    <TabsTrigger value="saas" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        SaaS
                    </TabsTrigger>
                    <TabsTrigger value="personal" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={selectedSegment} className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map((template, index) => {
                            const SegmentIcon =
                                segmentIcons[template.segment as keyof typeof segmentIcons] ||
                                LayoutTemplate;

                            return (
                                <motion.div
                                    key={template.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
                                        <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 relative">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <LayoutTemplate className="h-12 w-12 text-muted-foreground/30" />
                                            </div>

                                            {template.is_premium && (
                                                <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full flex items-center">
                                                    <Sparkles className="h-3 w-3 mr-1" /> Premium
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button>Use Template</Button>
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold">{template.name}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {template.description}
                                                    </p>
                                                </div>
                                                <SegmentIcon className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
