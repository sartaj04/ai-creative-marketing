import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="space-y-2 text-center">
                    <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Pixo
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
                    <p className="text-muted-foreground">Enter your credentials to access your agent.</p>
                </div>

                <Card className="border-0 shadow-xl ring-1 ring-slate-900/5">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl">Sign in</CardTitle>
                        <CardDescription>
                            Choose your preferred sign in method
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid grid-cols-2 gap-6">
                            <Button variant="outline">Github</Button>
                            <Button variant="outline">Google</Button>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <Input id="email" type="email" placeholder="m@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                            <Input id="password" type="password" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg">Sign In</Button>
                    </CardFooter>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="underline underline-offset-4 hover:text-primary">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
