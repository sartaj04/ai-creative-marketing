'use client';

import { motion } from 'framer-motion';
import { User, Briefcase, MapPin, Award, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCheckmark } from './AnimatedCheckmark';
import { 
  cardVariants, 
  staggerContainer, 
  staggerItem,
  prefersReducedMotion 
} from './motion-variants';

export interface ExtractionHighlights {
  name?: string;
  headline?: string;
  current_role?: string;
  current_company?: string;
  location?: string;
  skills_count?: number;
  experience_count?: number;
  years_experience?: number;
}

export interface ExtractionSummaryData {
  source: 'resume' | 'linkedin';
  fields_extracted: string[];
  highlights: ExtractionHighlights;
}

interface ExtractionSummaryProps {
  data: ExtractionSummaryData;
  onContinue: () => void;
}

export function ExtractionSummary({ data, onContinue }: ExtractionSummaryProps) {
  const reducedMotion = prefersReducedMotion();
  const { highlights } = data;

  const sourceLabel = 'LinkedIn Profile';

  return (
    <motion.div
      variants={cardVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      exit="exit"
      className="flex justify-start w-full"
    >
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm p-5 max-w-md w-full">
        {/* Header with checkmark */}
        <div className="flex items-center gap-3 mb-4">
          <AnimatedCheckmark size={44} color="green" />
          <div>
            <h3 className="font-semibold text-slate-900">
              {sourceLabel} Imported!
            </h3>
            <p className="text-xs text-slate-500">
              Found {data.fields_extracted.length} data points
            </p>
          </div>
        </div>

        {/* Extracted fields */}
        <motion.div
          variants={staggerContainer}
          initial={reducedMotion ? 'visible' : 'hidden'}
          animate="visible"
          className="bg-slate-50 rounded-lg p-4 space-y-3 mb-4"
        >
          {highlights.name && (
            <motion.div 
              variants={staggerItem}
              className="flex items-center gap-3"
            >
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="font-medium text-slate-900 text-sm">{highlights.name}</span>
            </motion.div>
          )}

          {(highlights.headline || highlights.current_role) && (
            <motion.div 
              variants={staggerItem}
              className="flex items-center gap-3"
            >
              <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-700 text-sm">
                {highlights.headline || highlights.current_role}
              </span>
            </motion.div>
          )}

          {(highlights.current_company || highlights.location) && (
            <motion.div 
              variants={staggerItem}
              className="flex items-center gap-3"
            >
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-sm">
                {highlights.current_company || highlights.location}
              </span>
            </motion.div>
          )}

          {highlights.years_experience && (
            <motion.div 
              variants={staggerItem}
              className="flex items-center gap-3"
            >
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-sm">
                {highlights.years_experience} years experience
              </span>
            </motion.div>
          )}

          {(highlights.skills_count || highlights.experience_count) && (
            <motion.div 
              variants={staggerItem}
              className="flex items-center gap-3"
            >
              <Award className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-sm">
                {highlights.skills_count ? `${highlights.skills_count} skills` : ''}
                {highlights.skills_count && highlights.experience_count ? ' • ' : ''}
                {highlights.experience_count ? `${highlights.experience_count} experiences` : ''}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Continue prompt */}
        <motion.div
          variants={staggerItem}
          initial={reducedMotion ? 'visible' : 'hidden'}
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm text-slate-600 mb-3">
            Great start! I've got your professional background. Now let me ask a few questions about your beliefs, interests, and aspirations to better understand what drives you.
          </p>
          
          <Button
            onClick={onContinue}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-10"
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
