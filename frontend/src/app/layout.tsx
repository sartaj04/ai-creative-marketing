import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Pixo - AI Creative Marketing Platform",
    description: "Generate stunning marketing creatives for Instagram, Facebook, LinkedIn, Twitter, and Google Ads using AI.",
    keywords: ["AI marketing", "creative automation", "social media ads", "Indian market", "e-commerce marketing"],
    openGraph: {
        title: "Pixo - AI Creative Marketing Platform",
        description: "Generate stunning marketing creatives for all platforms using AI",
        type: "website",
        locale: "en_IN",
        siteName: "Pixo",
    },
    twitter: {
        card: "summary_large_image",
        title: "Pixo - AI Creative Marketing Platform",
        description: "Generate stunning marketing creatives for all platforms using AI",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning className="light">
            <body className={`${inter.className} bg-white text-gray-900`}>
                <Providers>
                    {children}
                    <Toaster position="bottom-right" richColors />
                </Providers>
            </body>
        </html>
    );
}
