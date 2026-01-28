'use client';

import { ScrollReveal } from '../scroll-reveal';

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  centered?: boolean;
  dark?: boolean;
}

export function SectionHeader({
  label,
  title,
  description,
  centered = true,
  dark = false,
}: SectionHeaderProps) {
  return (
    <ScrollReveal>
      <div className={`${centered ? 'text-center max-w-3xl mx-auto' : ''} mb-20`}>
        {label && (
          <p
            className={`text-sm font-semibold uppercase tracking-widest mb-4 ${
              dark ? 'text-cyan-400' : 'text-cyan-600'
            }`}
          >
            {label}
          </p>
        )}
        <h2
          className={`text-3xl md:text-4xl lg:text-[2.75rem] font-semibold tracking-[-0.02em] leading-tight mb-6 ${
            dark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {title}
        </h2>
        {description && (
          <p
            className={`text-lg leading-relaxed tracking-tight ${
              dark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {description}
          </p>
        )}
      </div>
    </ScrollReveal>
  );
}
