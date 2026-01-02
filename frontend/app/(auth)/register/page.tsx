"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Sparkles, Eye, EyeOff, ShoppingBag, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth-store";
import { UserSegment } from "@/lib/types";
import { cn } from "@/lib/utils";

const registerSchema = z
    .object({
        email: z.string().email("Please enter a valid email"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain an uppercase letter")
            .regex(/[0-9]/, "Password must contain a number"),
        confirmPassword: z.string(),
        segment: z.enum(["ecommerce", "saas", "personal"]).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type RegisterForm = z.infer<typeof registerSchema>;

const segments = [
    {
        id: "ecommerce" as const,
        title: "E-commerce",
        description: "I sell products online",
        icon: ShoppingBag,
    },
    {
        id: "saas" as const,
        title: "SaaS",
        description: "I run a software business",
        icon: Building2,
    },
    {
        id: "personal" as const,
        title: "Personal Brand",
        description: "I'm building my personal brand",
        icon: User,
    },
];

export default function RegisterPage() {
    const router = useRouter();
    const { register: registerUser, isLoading } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<UserSegment | undefined>();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        try {
            await registerUser(data.email, data.password, selectedSegment);
            toast.success("Account created successfully!");
            router.push("/onboard");
        } catch (error) {
            toast.error("Registration failed. Please try again.");
        }
    };

    const selectSegment = (segment: UserSegment) => {
        setSelectedSegment(segment);
        setValue("segment", segment);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-bold">BrandScale AI</span>
                    </Link>
                    <CardTitle className="text-2xl">Create your account</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Start creating stunning marketing in minutes
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Segment Selection */}
                        <div className="space-y-3">
                            <Label>What type of business do you have?</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {segments.map((seg) => (
                                    <button
                                        key={seg.id}
                                        type="button"
                                        onClick={() => selectSegment(seg.id)}
                                        className={cn(
                                            "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                                            selectedSegment === seg.id
                                                ? "border-primary bg-primary/5"
                                                : "border-muted hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <seg.icon
                                            className={cn(
                                                "h-6 w-6 mb-2",
                                                selectedSegment === seg.id
                                                    ? "text-primary"
                                                    : "text-muted-foreground"
                                            )}
                                        />
                                        <span className="text-sm font-medium">{seg.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                {...register("email")}
                                error={errors.email?.message}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...register("password")}
                                    error={errors.password?.message}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                {...register("confirmPassword")}
                                error={errors.confirmPassword?.message}
                            />
                        </div>

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Create Account
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
