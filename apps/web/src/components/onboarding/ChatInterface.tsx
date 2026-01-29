'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { ChatMessage, Message } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { FileUploadZone } from './FileUploadZone';
import { ParsingState } from './ParsingState';
import { LinkedInHelper } from './LinkedInHelper';
import { ExtractionSummary, ExtractionSummaryData } from './ExtractionSummary';
import { ProfileConfirmation, BrandProfile } from './ProfileConfirmation';
import { 
  containerVariants, 
  messageVariants,
  prefersReducedMotion,
  smoothScrollConfig 
} from './motion-variants';

// Re-export Message type for external use
export type { Message } from './ChatMessage';

export type UIHint = 'show_upload' | 'show_linkedin_helper' | 'show_confirmation' | null;

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isTyping: boolean;
  
  // File upload
  onFileUpload?: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  
  // Parsing state
  isParsing?: boolean;
  parsingFileName?: string;
  
  // Extraction summary
  extractionSummary?: ExtractionSummaryData | null;
  onExtractionContinue?: () => void;
  
  // Profile confirmation
  showConfirmation?: boolean;
  brandProfile?: BrandProfile;
  onConfirmProfile?: (profile: BrandProfile) => void;
  isConfirming?: boolean;
  
  // UI hints from API
  uiHint?: UIHint;
  onDismissHint?: () => void;
}

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  isTyping,
  onFileUpload,
  isUploading = false,
  uploadProgress,
  isParsing = false,
  parsingFileName,
  extractionSummary,
  onExtractionContinue,
  showConfirmation = false,
  brandProfile,
  onConfirmProfile,
  isConfirming = false,
  uiHint,
  onDismissHint
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [showLinkedInHelper, setShowLinkedInHelper] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = prefersReducedMotion();

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView(smoothScrollConfig);
    }
  }, [messages, isTyping, extractionSummary, showConfirmation]);

  // Handle UI hints from API
  useEffect(() => {
    if (uiHint === 'show_upload') {
      setShowUploadZone(true);
    } else if (uiHint === 'show_linkedin_helper') {
      setShowLinkedInHelper(true);
    }
  }, [uiHint]);

  // Detect upload/linkedin keywords in user input
  const detectIntent = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('upload') || lowerText.includes('linkedin') || lowerText.includes('profile') || lowerText.includes('pdf')) {
      setShowUploadZone(true);
    }
    if (lowerText.includes('linkedin')) {
      setShowLinkedInHelper(true);
    }
  }, []);

  const handleSubmit = () => {
    if (!input.trim() || isTyping) return;
    detectIntent(input);
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (file: File) => {
    setShowUploadZone(false);
    onFileUpload?.(file);
  };

  const handleUploadClick = () => {
    setShowLinkedInHelper(false);
    setShowUploadZone(true);
  };

  const handleDismissUpload = () => {
    setShowUploadZone(false);
    onDismissHint?.();
  };

  const handleDismissLinkedIn = () => {
    setShowLinkedInHelper(false);
    onDismissHint?.();
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      className="flex flex-col h-[85vh] w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-5 py-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Pixo</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Building your brand profile
          </p>
        </div>
      </motion.div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 bg-gradient-to-b from-slate-50/80 to-white">
        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((msg, idx) => (
            <ChatMessage 
              key={`msg-${idx}`} 
              message={msg} 
              isLatest={idx === messages.length - 1}
            />
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator key="typing" />}
          
          {/* Parsing state */}
          {isParsing && (
            <ParsingState 
              key="parsing"
              fileName={parsingFileName}
              status={isUploading ? 'uploading' : 'parsing'}
              progress={uploadProgress}
            />
          )}

          {/* Extraction summary */}
          {extractionSummary && onExtractionContinue && (
            <ExtractionSummary 
              key="extraction"
              data={extractionSummary}
              onContinue={onExtractionContinue}
            />
          )}

          {/* Profile confirmation */}
          {showConfirmation && brandProfile && onConfirmProfile && (
            <ProfileConfirmation
              key="confirmation"
              profile={brandProfile}
              onConfirm={onConfirmProfile}
              isConfirming={isConfirming}
            />
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <div className="p-4 bg-white border-t border-slate-100">
        {/* LinkedIn helper */}
        <AnimatePresence>
          {showLinkedInHelper && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <LinkedInHelper 
                onDismiss={handleDismissLinkedIn}
                onUploadClick={handleUploadClick}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload zone */}
        <AnimatePresence>
          {showUploadZone && !isParsing && !extractionSummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <FileUploadZone
                onFileSelect={handleFileSelect}
                onCancel={handleDismissUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text input */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={showConfirmation ? "Add any additional notes..." : "Type your message..."}
            disabled={isTyping || isParsing || isConfirming}
            className={cn(
              "min-h-[56px] max-h-[120px] pr-24 resize-none",
              "bg-slate-50 border-slate-200 rounded-xl",
              "focus-visible:ring-cyan-500 focus-visible:ring-offset-0",
              "placeholder:text-slate-400",
              "transition-all duration-200"
            )}
          />
          
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* Attachment button */}
            {onFileUpload && !showUploadZone && !isParsing && !showConfirmation && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUploadZone(true)}
                className="h-8 w-8 text-slate-400 hover:text-slate-600"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            )}
            
            {/* Send button */}
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isTyping || isParsing || isConfirming}
              className={cn(
                "h-8 w-8 p-0 rounded-lg",
                "bg-cyan-600 hover:bg-cyan-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200"
              )}
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-xs text-center text-slate-400 mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </motion.div>
  );
}
