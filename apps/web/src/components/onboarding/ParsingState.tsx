'use client';

import { motion } from 'framer-motion';
import { FileText, Loader2 } from 'lucide-react';
import { 
  cardVariants, 
  pulseVariants,
  prefersReducedMotion 
} from './motion-variants';

interface ParsingStateProps {
  fileName?: string;
  status?: 'uploading' | 'parsing' | 'processing';
  progress?: number;
}

export function ParsingState({ 
  fileName, 
  status = 'parsing',
  progress 
}: ParsingStateProps) {
  const reducedMotion = prefersReducedMotion();

  const statusMessages = {
    uploading: 'Uploading your file...',
    parsing: 'Analyzing your LinkedIn profile...',
    processing: 'Extracting your experience...'
  };

  return (
    <motion.div
      variants={cardVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      exit="exit"
      className="flex justify-start"
    >
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm p-4 max-w-sm">
        <div className="flex items-center gap-3">
          {/* Animated icon */}
          <motion.div
            variants={pulseVariants}
            initial={reducedMotion ? undefined : 'hidden'}
            animate={reducedMotion ? undefined : 'visible'}
            className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center"
          >
            <FileText className="w-5 h-5 text-cyan-600" />
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
              {statusMessages[status]}
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />
            </p>
            {fileName && (
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {fileName}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-3">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Animated ellipsis for indeterminate state */}
        {progress === undefined && (
          <div className="mt-2 flex items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="text-slate-400 text-xs"
                animate={{ 
                  opacity: reducedMotion ? 1 : [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut'
                }}
              >
                .
              </motion.span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
