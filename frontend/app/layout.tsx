import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "BrandScale AI - AI-Powered Creative Marketing",
    description:
        "Generate stunning marketing creatives for your E-commerce, SaaS or Personal brand in seconds using AI. Multi-language support, festival themes, and platform-ready outputs.",
    keywords: [
        "AI marketing",
        "creative automation",
        "e-commerce ads",
        "SaaS marketing",
        "personal branding",
        "social media",
        "India",
    ],
    authors: [{ name: "BrandScale AI" }],
    openGraph: {
        title: "BrandScale AI - AI-Powered Creative Marketing",
        description:
            "Generate stunning marketing creatives for your brand in seconds using AI.",
        url: "https://brandscale.ai",
        siteName: "BrandScale AI",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <QueryProvider>
                    {children}
                    <Toaster />
                </QueryProvider>
            </body>
        </html>
    );
}
