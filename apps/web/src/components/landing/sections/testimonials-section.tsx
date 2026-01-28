'use client';

import { Card } from '@/components/ui/card';
import { StaggerContainer, StaggerItem } from '../scroll-reveal';
import { SectionHeader } from './section-header';
import { featuredTestimonials } from '@/data/social-proof';

export function TestimonialsSection() {
  // Use first 3 testimonials for the main section
  const displayTestimonials = featuredTestimonials.slice(0, 3);

  return (
    <section className="py-28 px-6 md:px-12 lg:px-16 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          label="Testimonials"
          title="What our users say"
        />

        <StaggerContainer
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          staggerDelay={0.1}
        >
          {displayTestimonials.map((testimonial, i) => (
            <StaggerItem key={i}>
              <Card className="p-7 border-slate-200 bg-white rounded-2xl h-full flex flex-col">
                <p className="text-slate-600 leading-relaxed mb-8 flex-1">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-cyan-500/20">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 tracking-tight">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-slate-500">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
