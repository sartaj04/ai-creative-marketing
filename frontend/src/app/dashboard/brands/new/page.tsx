"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Globe, ArrowRight, CheckCircle } from "lucide-react";
import { brandsApi } from "@/lib/api";

const brandSchema = z.object({
    name: z.string().min(1, "Brand name is required"),
    website_url: z.string().url("Please enter a valid URL"),
    profile_type: z.enum(["ecommerce", "saas", "personal"]),
    description: z.string().optional(),
});

type BrandFormData = z.infer<typeof brandSchema>;

export default function NewBrandPage() {
    const router = useRouter();
    const [step, setStep] = useState<"form" | "scraping" | "complete">("form");
    const [scrapingProgress, setScrapingProgress] = useState(0);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
    } = useForm<BrandFormData>({
        resolver: zodResolver(brandSchema),
        defaultValues: {
            profile_type: "ecommerce",
        },
    });

    const selectedType = watch("profile_type");

    const onSubmit = async (data: BrandFormData) => {
        try {
            setStep("scraping");

            // Simulate scraping progress
            const progressInterval = setInterval(() => {
                setScrapingProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 500);

            // Create brand and trigger scraping
            const res = await brandsApi.create(data);

            clearInterval(progressInterval);
            setScrapingProgress(100);
            setStep("complete");

            toast.success("Brand profile created successfully!");

            // Redirect after brief delay
            setTimeout(() => {
                router.push(`/dashboard/brands/${res.data.id}`);
            }, 1500);

        } catch (error: any) {
            setStep("form");
            toast.error(error.response?.data?.detail || "Failed to create brand profile");
        }
    };

    if (step === "scraping") {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Extracting brand assets...
                    </h2>
                    <p className="text-gray-600 mb-8">
                        We&apos;re scanning your website for logos, colors, fonts, and products.
                    </p>
                    <div className="max-w-md mx-auto">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${scrapingProgress}%` }}
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">{scrapingProgress}% complete</p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "complete") {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Brand profile created!
                    </h2>
                    <p className="text-gray-600">
                        Redirecting you to your brand profile...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Add Brand Profile</h1>
                <p className="text-gray-600 mt-1">
                    Enter your website URL and we&apos;ll extract your brand assets automatically
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                    {/* Website URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Website URL
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                {...register("website_url")}
                                type="url"
                                placeholder="https://yourwebsite.com"
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        {errors.website_url && (
                            <p className="mt-1 text-sm text-red-600">{errors.website_url.message}</p>
                        )}
                    </div>

                    {/* Brand Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Brand Name
                        </label>
                        <input
                            {...register("name")}
                            type="text"
                            placeholder="Your Brand Name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Profile Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: "ecommerce", label: "E-commerce", desc: "Online store" },
                                { value: "saas", label: "SaaS", desc: "Software product" },
                                { value: "personal", label: "Personal", desc: "Creator/Influencer" },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition ${selectedType === option.value
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-gray-200 hover:border-primary-300"
                                        }`}
                                >
                                    <input
                                        {...register("profile_type")}
                                        type="radio"
                                        value={option.value}
                                        className="sr-only"
                                    />
                                    <span className="font-medium text-gray-900">{option.label}</span>
                                    <span className="text-xs text-gray-500">{option.desc}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            {...register("description")}
                            rows={3}
                            placeholder="Brief description of your brand..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Extract Brand Assets
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
