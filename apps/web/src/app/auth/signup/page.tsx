import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md space-y-8">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
                    <p className="text-muted-foreground">Start building your professional authority today.</p>
                </div>

                <Card className="border-0 shadow-xl ring-1 ring-slate-900/5">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl">Sign up</CardTitle>
                        <CardDescription>
                            Enter your information to get started
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full Name</label>
                            <Input id="name" placeholder="John Doe" />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <Input id="email" type="email" placeholder="m@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                            <Input id="password" type="password" />
                        </div>
                        <Button className="w-full mt-4" size="lg">Create Account</Button>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
