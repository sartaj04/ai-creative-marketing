'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { onboardingApi } from '@/lib/api/onboarding';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { PixoCharacter } from '@/components/auth/PixoCharacter';

function AuthContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login, register: signup, isLoading, error, clearError } = useAuthStore();
    const { toast } = useToast();

    // Determine mode from URL (default to login)
    const mode = searchParams.get('mode');
    const isSignup = mode === 'signup';

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        clearError();
    }, [mode, clearError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        try {
            if (isSignup) {
                await signup(email, password, name);
                toast({
                    title: 'Account created!',
                    description: 'Welcome to Pixo. Let\'s set up your agent.',
                });
                router.push('/onboarding'); // Redirect to onboarding flow
            } else {
                await login(email, password);
                toast({
                    title: 'Welcome back',
                    description: 'Checking your profile...',
                });

                // Check onboarding status before redirecting
                try {
                    const status = await onboardingApi.getStatus();
                    if (status.is_complete) {
                        router.push('/dashboard/inbox');
                    } else if (status.completeness_score > 0 || status.has_extraction) {
                        // User has some data but onboarding wasn't formally completed.
                        // Auto-complete and send to dashboard — identity page handles the rest.
                        try { await onboardingApi.complete(); } catch {}
                        router.push('/dashboard/inbox');
                    } else {
                        router.push('/onboarding');
                    }
                } catch (error) {
                    // If status check fails, go to dashboard (safer for returning users)
                    console.error('Failed to check onboarding status:', error);
                    router.push('/dashboard/inbox');
                }
            }
        } catch (err) {
            toast({
                title: isSignup ? 'Signup Failed' : 'Login Failed',
                description: 'Please check your information and try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
            {/* Left Panel - Form */}
            <div className="flex flex-col p-8 md:p-16 justify-center relative bg-white">
                <Link href="/" className="absolute top-8 left-8 text-sm font-medium text-slate-500 hover:text-cyan-600 flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <div className="max-w-sm w-full mx-auto space-y-8 animate-fade-in-up">
                    <div className="space-y-2 text-center">
                        <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
                            <div className="w-10 h-10 relative rounded-xl overflow-hidden shadow-sm">
                                <Image
                                    src="/android-chrome-192x192.png"
                                    alt="Pixo Logo"
                                    fill
                                    sizes="40px"
                                    priority
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex items-start">
                                <span className="text-2xl font-bold tracking-tight text-slate-900 leading-none">Pixo</span>
                                <span className="text-[10px] font-bold text-cyan-600 tracking-wide leading-none -mt-1 ml-0.5">AI</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            {isSignup ? 'Start your journey' : 'Welcome back'}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {isSignup ? 'Turn your personal brand into an authority system.' : 'Enter your credentials to access your agent.'}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isSignup && (
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Jane Doe"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="h-11 bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    placeholder="name@company.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11 bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    {!isSignup && (
                                        <Link href="#" className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-lg font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 hover:shadow-cyan-600/30 transition-all hover:-translate-y-0.5"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        {isSignup ? 'Creating account...' : 'Signing in...'}
                                    </>
                                ) : (
                                    isSignup ? 'Get Started' : 'Sign In'
                                )}
                            </Button>
                        </form>
                    </div>

                    <div className="text-center text-sm">
                        {isSignup ? (
                            <p className="text-slate-500">
                                Already have an account?{' '}
                                <Link href="/auth" className="font-semibold text-cyan-600 hover:text-cyan-500 hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        ) : (
                            <p className="text-slate-500">
                                Don't have an account?{' '}
                                <Link href="/auth?mode=signup" className="font-semibold text-cyan-600 hover:text-cyan-500 hover:underline">
                                    Sign up
                                </Link>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel - Visual */}
            <div className="hidden lg:flex relative bg-slate-50/50 overflow-hidden items-center justify-center p-16 border-l border-slate-100">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-50/50 via-transparent to-blue-50/50" />

                {/* Floating Elements */}
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-[128px] pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-[128px] pointer-events-none" />

                <div className="relative z-10 max-w-lg text-center space-y-8 p-10 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl flex flex-col items-center">
                    <PixoCharacter />

                    <div className="space-y-4">
                        <blockquote className="text-2xl font-medium leading-relaxed text-slate-800">
                            "I'm so excited to help you build your brand! Let's get started!"
                        </blockquote>
                        <div className="text-cyan-600 font-bold text-lg tracking-wide uppercase text-xs">
                            — Pixo AI
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div>}>
            <AuthContent />
        </Suspense>
    );
}
