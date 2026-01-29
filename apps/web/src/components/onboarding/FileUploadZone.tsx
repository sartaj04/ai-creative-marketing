'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  uploadZoneVariants, 
  prefersReducedMotion 
} from './motion-variants';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onCancel?: () => void;
  accept?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function FileUploadZone({ 
  onFileSelect, 
  onCancel,
  accept = '.pdf,.docx',
  isUploading = false,
  uploadProgress
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = prefersReducedMotion();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      variants={uploadZoneVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      exit="exit"
      className="w-full"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClick : undefined}
        animate={isDragging ? 'dragging' : 'idle'}
        variants={{
          idle: { 
            borderColor: 'rgb(226 232 240)',
            backgroundColor: 'rgb(248 250 252)',
            scale: 1
          },
          dragging: { 
            borderColor: 'rgb(6 182 212)',
            backgroundColor: 'rgb(236 254 255)',
            scale: 1.01
          }
        }}
        className={`
          relative border-2 border-dashed rounded-xl p-6 
          transition-colors cursor-pointer
          ${isUploading ? 'cursor-default' : 'hover:border-cyan-400 hover:bg-cyan-50/50'}
        `}
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <motion.div
            animate={isDragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-3
              ${isDragging ? 'bg-cyan-100' : 'bg-slate-100'}
            `}
          >
            {selectedFile ? (
              <FileText className={`w-6 h-6 ${isDragging ? 'text-cyan-600' : 'text-slate-600'}`} />
            ) : (
              <Upload className={`w-6 h-6 ${isDragging ? 'text-cyan-600' : 'text-slate-500'}`} />
            )}
          </motion.div>

          {/* Text */}
          <AnimatePresence mode="wait">
            {isUploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <p className="text-sm font-medium text-slate-700">
                  Uploading {selectedFile?.name}...
                </p>
                {uploadProgress !== undefined && (
                  <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden mx-auto">
                    <motion.div
                      className="h-full bg-cyan-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </motion.div>
            ) : selectedFile ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-sm font-medium text-slate-700">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Click to choose a different file
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-sm font-medium text-slate-700">
                  {isDragging ? 'Drop your file here' : 'Drag & drop your LinkedIn profile PDF here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  or click to browse (PDF, DOCX)
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cancel button */}
        {onCancel && !isUploading && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="absolute top-2 right-2 h-8 w-8 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
