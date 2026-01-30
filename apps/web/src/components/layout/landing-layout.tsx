'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const useCaseLinks = [
  { name: 'For Founders', href: '/use-cases/founders' },
  { name: 'For Executives', href: '/use-cases/executives' },
  { name: 'For Consultants', href: '/use-cases/consultants' },
  { name: 'For Teams', href: '/use-cases/teams' },
];

const resourceLinks = [
  { name: 'Blog', href: '/blog' },
  { name: 'Affiliate', href: '/affiliate' },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [useCasesOpen, setUseCasesOpen] = useState(false);

  return (
    <nav className="fixed top-8 left-0 right-0 z-50 transition-all duration-300 py-2.5 px-4 bg-white/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 rounded-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 relative rounded-lg overflow-hidden shadow-sm">
            <Image
              src="/android-chrome-192x192.png"
              alt="Pixo Logo"
              fill
              className="object-cover"
            />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-slate-800">
            Pixo<sup className="text-[10px] font-semibold text-blue-500 ml-0.5 -top-1.5">ai</sup>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/#features"
            className="text-sm font-medium text-slate-600 hover:text-cyan-600 transition-colors"
          >
            Features
          </Link>

          {/* Use Cases Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setUseCasesOpen(true)}
            onMouseLeave={() => setUseCasesOpen(false)}
          >
            <button className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-cyan-600 transition-colors py-2">
              Use Cases
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${useCasesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {useCasesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-48">
                <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 py-1.5 overflow-hidden">
                  {useCaseLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-cyan-600 transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/blog"
            className="text-sm font-medium text-slate-600 hover:text-cyan-600 transition-colors"
          >
            Blog
          </Link>

          <Link
            href="/affiliate"
            className="text-sm font-medium text-slate-600 hover:text-cyan-600 transition-colors"
          >
            Affiliate
          </Link>

          <Link
            href="/#pricing"
            className="text-sm font-medium text-slate-600 hover:text-cyan-600 transition-colors"
          >
            Pricing
          </Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/auth">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 h-9"
            >
              Log in
            </Button>
          </Link>
          <Link href="/auth?mode=signup">
            <Button size="sm" className="h-9 px-5 rounded-full font-semibold shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow bg-slate-900 text-white hover:bg-slate-800">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-slate-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border border-slate-100 shadow-xl py-4 px-6 mt-2 rounded-2xl mx-1">
          <div className="space-y-4">
            <Link
              href="/#features"
              className="block text-sm font-medium text-slate-600 hover:text-cyan-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Use Cases
              </p>
              {useCaseLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-slate-600 hover:text-cyan-600 pl-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <Link
              href="/blog"
              className="block text-sm font-medium text-slate-600 hover:text-cyan-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/affiliate"
              className="block text-sm font-medium text-slate-600 hover:text-cyan-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Affiliate
            </Link>
            <Link
              href="/#pricing"
              className="block text-sm font-medium text-slate-600 hover:text-cyan-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full rounded-xl">
                  Log in
                </Button>
              </Link>
              <Link
                href="/auth?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full rounded-xl">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="py-16 px-6 md:px-12 border-t border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-1.5 mb-4">
              <div className="w-9 h-9 relative rounded-lg overflow-hidden">
                <Image
                  src="/android-chrome-192x192.png"
                  alt="Pixo Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-[24px] font-display font-bold tracking-tight text-slate-800">
                Pixo<sup className="text-[10px] font-semibold text-blue-500 ml-0.5 -top-2">ai</sup>
              </span>
            </Link>
            <p className="text-slate-500 text-sm max-w-xs mb-4">
              The autonomous brand operating system. Build authority,
              reputation, and trust with AI.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/company/pixo-ai-ltd/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-cyan-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              {/* <a
                href="https://twitter.com/pixoai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-cyan-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a> */}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4 text-sm">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/features"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  How it Works
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Use Cases */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4 text-sm">
              Use Cases
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/use-cases/founders"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  For Founders
                </Link>
              </li>
              <li>
                <Link
                  href="/use-cases/executives"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  For Executives
                </Link>
              </li>
              <li>
                <Link
                  href="/use-cases/consultants"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  For Consultants
                </Link>
              </li>
              <li>
                <Link
                  href="/use-cases/teams"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  For Teams
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4 text-sm">
              Resources
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/blog"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/affiliate"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  Affiliate
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  Help Center
                </Link>
              </li>

            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4 text-sm">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Neurocell Technologies Pvt Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/cookies"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cookie Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
