'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Check, Download, AlertCircle, ArrowLeft } from 'lucide-react';

interface LinkedInImportStepProps {
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
    onBack?: () => void;
    onSwitchToManual?: () => void;
    onSwitchToConversation?: () => void;
}

export function LinkedInImportStep({ onFileSelect, isProcessing, onBack, onSwitchToManual, onSwitchToConversation }: LinkedInImportStepProps) {
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

    // Note: Resources option is not available on mobile LinkedIn app

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Back Button */}
            {onBack && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={onBack}
                    className="flex items-center text-slate-600 hover:text-slate-900 transition-colors mb-2 sm:mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Back to options</span>
                </motion.button>
            )}

            <div className="space-y-2">
                <p className="text-sm sm:text-base text-slate-600">
                    Upload your LinkedIn profile PDF or resume, and Pixo will extract your work history, skills, and summary to build your baseline identity.
                </p>
            </div>

            {/* Instruction Cards - Responsive grid */}
            <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                    {instructions.map((step, idx) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex sm:flex-col items-center sm:text-center text-xs text-slate-500 gap-3 sm:gap-0"
                        >
                            <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center sm:mb-2 shadow-sm text-cyan-600 flex-shrink-0">
                                {step.icon}
                            </div>
                            <span>{step.text}</span>
                        </motion.div>
                    ))}
                </div>
                
                {/* Desktop Browser Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-xs text-amber-800"
                >
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                        <strong>Note:</strong> The "Resources" option is only available on desktop browsers. It is not available on mobile browsers or the LinkedIn mobile app. Please use a desktop browser to access this feature.
                    </span>
                </motion.div>
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
                    className="border-2 border-dashed rounded-xl h-48 sm:h-64 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 group relative overflow-hidden"
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
                                        <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-500" />
                                    </motion.div>
                                    <p className="mt-3 sm:mt-4 text-sm font-medium text-slate-600">Uploading...</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="flex flex-col items-center z-10 p-4 sm:p-6 text-center"
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 text-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                                </div>
                                <h4 className="text-base sm:text-lg font-semibold text-slate-800">
                                    Drop your LinkedIn PDF or Resume here
                                </h4>
                                <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2 max-w-[200px]">
                                    or tap to browse your files
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-3 sm:bottom-4 left-0 right-0 flex justify-center px-4"
                        >
                            <div className="bg-red-50 text-red-600 px-3 sm:px-4 py-2 rounded-full text-xs font-medium flex items-center">
                                <AlertCircle className="w-3 h-3 mr-2 flex-shrink-0" />
                                <span className="truncate">{error}</span>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* Manual Entry Options */}
            {(onSwitchToConversation || onSwitchToManual) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pt-4 sm:pt-6 border-t border-slate-200 space-y-3"
                >
                    <p className="text-sm text-slate-600 mb-3 text-center">
                        Don't have a profile or resume ready?
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Speak with Pixo option */}
                        {onSwitchToConversation && (
                            <motion.button
                                onClick={onSwitchToConversation}
                                className="py-3 px-4 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border-2 border-cyan-200 hover:border-cyan-300 rounded-lg text-sm font-medium text-slate-700 transition-all"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-base">💬</span>
                                    <span>Speak with Pixo</span>
                                </div>
                            </motion.button>
                        )}
                        
                        {/* Manual form option */}
                        {onSwitchToManual && (
                            <motion.button
                                onClick={onSwitchToManual}
                                className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-sm font-medium text-slate-700 transition-all"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-base">📝</span>
                                    <span>Fill Out Forms</span>
                                </div>
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            )}
            
            {/* Bottom safe area spacer for mobile */}
            <div className="h-4 sm:h-0" aria-hidden="true" />
        </div>
    );
}
