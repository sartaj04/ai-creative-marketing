'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Pencil, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnimatedCheckmark } from './AnimatedCheckmark';
import { 
  confirmationCardVariants,
  confirmationFieldVariants,
  buttonHoverVariants,
  prefersReducedMotion 
} from './motion-variants';

export interface BrandProfile {
  role?: string;
  industry?: string;
  expertise?: string[];
  topics?: string[];
  audience?: string;
  tone?: string;
}

interface ProfileConfirmationProps {
  profile: BrandProfile;
  onConfirm: (profile: BrandProfile) => void;
  onEdit?: (field: keyof BrandProfile, value: string | string[]) => void;
  isConfirming?: boolean;
}

interface EditableFieldProps {
  label: string;
  value: string | string[] | undefined;
  fieldKey: keyof BrandProfile;
  onSave: (value: string) => void;
}

function EditableField({ label, value, fieldKey, onSave }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    Array.isArray(value) ? value.join(', ') : value || ''
  );

  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(Array.isArray(value) ? value.join(', ') : value || '');
    setIsEditing(false);
  };

  return (
    <motion.div 
      variants={confirmationFieldVariants}
      className="group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
            {label}
          </p>
          
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2"
              >
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleSave}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.p
                key="view"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm text-slate-900"
              >
                {displayValue || <span className="text-slate-400 italic">Not set</span>}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 rounded-md"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function ProfileConfirmation({ 
  profile, 
  onConfirm, 
  onEdit,
  isConfirming = false
}: ProfileConfirmationProps) {
  const reducedMotion = prefersReducedMotion();
  const [localProfile, setLocalProfile] = useState<BrandProfile>(profile);

  const handleFieldSave = (field: keyof BrandProfile, value: string) => {
    const newValue = field === 'expertise' || field === 'topics' 
      ? value.split(',').map(v => v.trim()).filter(Boolean)
      : value;
    
    setLocalProfile(prev => ({ ...prev, [field]: newValue }));
    onEdit?.(field, newValue);
  };

  const fields: Array<{ key: keyof BrandProfile; label: string }> = [
    { key: 'role', label: 'Role / Title' },
    { key: 'industry', label: 'Industry' },
    { key: 'expertise', label: 'Expertise' },
    { key: 'topics', label: 'Topics' },
    { key: 'audience', label: 'Audience' },
    { key: 'tone', label: 'Tone' },
  ];

  return (
    <motion.div
      variants={confirmationCardVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      className="flex justify-start w-full"
    >
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-lg p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Your Brand Profile</h3>
            <p className="text-xs text-slate-500">Review and confirm your details</p>
          </div>
        </div>

        {/* Fields */}
        <motion.div
          variants={confirmationCardVariants}
          initial={reducedMotion ? 'visible' : 'hidden'}
          animate="visible"
          className="space-y-4 mb-6"
        >
          {fields.map(({ key, label }) => (
            <EditableField
              key={key}
              label={label}
              value={localProfile[key]}
              fieldKey={key}
              onSave={(value) => handleFieldSave(key, value)}
            />
          ))}
        </motion.div>

        {/* Confirm CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-slate-600 mb-4 text-center">
            Does this look right?
          </p>
          
          <motion.div
            variants={buttonHoverVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              onClick={() => onConfirm(localProfile)}
              disabled={isConfirming}
              className="w-full h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-md hover:shadow-lg transition-shadow"
            >
              {isConfirming ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.span>
                  Setting up your profile...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Looks Good!
                </span>
              )}
            </Button>
          </motion.div>

          <p className="text-xs text-slate-400 text-center mt-3">
            You can always edit these later in settings
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
