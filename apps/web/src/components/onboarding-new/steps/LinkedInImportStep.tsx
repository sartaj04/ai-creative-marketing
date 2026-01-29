'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Check, Download, AlertCircle } from 'lucide-react';

interface LinkedInImportStepProps {
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
}

export function LinkedInImportStep({ onFileSelect, isProcessing }: LinkedInImportStepProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        setError(null);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                onFileSelect(file);
            } else {
                setError('Please upload a PDF file.');
            }
        }
    }, [onFileSelect]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type === 'application/pdf') {
                onFileSelect(file);
            } else {
                setError('Please upload a PDF file.');
            }
        }
    };

    const instructions = [
        { id: 1, text: "Go to your LinkedIn Profile", icon: <UploadCloud className="w-4 h-4" /> },
        { id: 2, text: "Click 'Resources'", icon: <Check className="w-4 h-4" /> },
        { id: 3, text: "Select 'Save to PDF'", icon: <Download className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <p className="text-slate-600">
                    We'll extract your work history, skills, and summary to build your baseline identity.
                </p>
            </div>

            {/* Instruction Cards Carousel - Simplified for this step, can be elaborate */}
            <div className="grid grid-cols-3 gap-4">
                {instructions.map((step, idx) => (
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col items-center text-center text-xs text-slate-500"
                    >
                        <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2 shadow-sm text-cyan-600">
                            {step.icon}
                        </div>
                        {step.text}
                    </motion.div>
                ))}
            </div>

            {/* Comparison/Drop Zone */}
            <div className="relative">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                />

                <motion.div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    animate={{
                        borderColor: isDragging ? 'var(--cta)' : 'var(--border)',
                        backgroundColor: isDragging ? 'hsla(var(--cta), 0.05)' : 'white',
                        scale: isDragging ? 1.02 : 1,
                    }}
                    className={`
                border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer
                transition-colors duration-200 group relative overflow-hidden
            `}
                >
                    {/* Animated Background Grid or Texture could go here */}

                    <AnimatePresence>
                        {isProcessing ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"
                            >
                                {/* Processing state is handled by the parent mostly, but we can show immediate feedback here */}
                                <div className="flex flex-col items-center">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <UploadCloud className="w-10 h-10 text-cyan-500" />
                                    </motion.div>
                                    <p className="mt-4 text-sm font-medium text-slate-600">Uploading...</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="flex flex-col items-center z-10 p-6 text-center"
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-semibold text-slate-800">
                                    Drop your LinkedIn PDF here
                                </h4>
                                <p className="text-sm text-slate-400 mt-2 max-w-[200px]">
                                    or click to browse your files
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-4 left-0 right-0 flex justify-center"
                        >
                            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-medium flex items-center">
                                <AlertCircle className="w-3 h-3 mr-2" />
                                {error}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
