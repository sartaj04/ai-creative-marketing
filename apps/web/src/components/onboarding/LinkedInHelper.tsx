'use client';

import { motion } from 'framer-motion';
import { Linkedin, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  helperBlockVariants, 
  helperStepVariants,
  prefersReducedMotion 
} from './motion-variants';

interface LinkedInHelperProps {
  onDismiss?: () => void;
  onUploadClick?: () => void;
}

const steps = [
  'Go to your LinkedIn profile',
  'Click "Resources" below your profile photo',
  'Select "Download PDF"',
  'Upload the downloaded file here'
];

export function LinkedInHelper({ onDismiss, onUploadClick }: LinkedInHelperProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      variants={helperBlockVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      exit="exit"
      className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl" />
      
      {/* Dismiss button */}
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-7 w-7 text-blue-400 hover:text-blue-600 hover:bg-blue-100/50"
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Linkedin className="w-4 h-4 text-blue-600" />
          </div>
          <h4 className="font-semibold text-blue-900 text-sm">
            How to upload your LinkedIn profile
          </h4>
        </div>

        {/* Steps */}
        <ol className="space-y-2 mb-4">
          {steps.map((step, i) => (
            <motion.li
              key={i}
              variants={helperStepVariants}
              className="flex items-start gap-2 text-sm text-blue-800"
            >
              <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-700 mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </motion.li>
          ))}
        </ol>

        {/* Alternative */}
        <motion.div
          variants={helperStepVariants}
          className="pt-3 border-t border-blue-100"
        >
          <p className="text-xs text-blue-700 mb-3">
            <strong>Alternative:</strong> Copy and paste your headline, About section, and Experience directly into the chat.
          </p>
          
          {onUploadClick && (
            <Button
              onClick={onUploadClick}
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Upload LinkedIn PDF
            </Button>
          )}
        </motion.div>

        {/* LinkedIn link hint */}
        <motion.a
          variants={helperStepVariants}
          href="https://www.linkedin.com/in/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-3"
        >
          Open LinkedIn
          <ExternalLink className="w-3 h-3" />
        </motion.a>
      </div>
    </motion.div>
  );
}
