'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, MicOff, Check, Loader2, ArrowLeft, X, Volume2, VolumeX } from 'lucide-react';
import { onboardingApi, ChatMessage, ConversationalExtractedData } from '@/lib/api/onboarding';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { PixoCharacter } from '@/components/auth/PixoCharacter';

interface ConversationalOnboardingProps {
    onComplete: () => void;
    onBack?: () => void;
}

// Initial greeting from Pixo
const INITIAL_MESSAGE: ChatMessage = {
    role: 'assistant',
    content: "Hey there! I'm Pixo, and I'm excited to help you build your personal brand. Let's start with the basics - what's your current role? What do you do professionally?"
};

export function ConversationalOnboarding({ onComplete, onBack }: ConversationalOnboardingProps) {
    const [currentQuestion, setCurrentQuestion] = useState<string>(INITIAL_MESSAGE.content);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [extractedData, setExtractedData] = useState<ConversationalExtractedData | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [autoListenPending, setAutoListenPending] = useState(false);
    const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
    
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const hasSpokenInitial = useRef(false);
    
    // Voice input
    const { 
        isListening, 
        transcript, 
        isSupported: isVoiceSupported,
        start: startListening,
        stop: stopListening,
        reset: resetTranscript
    } = useSpeechRecognition();

    // Voice output
    const {
        speak,
        cancel: cancelSpeech,
        isSpeaking,
        isSupported: isSpeechSupported
    } = useSpeechSynthesis();

    // Track when speech ends to trigger auto-listening
    const wasSpeakingRef = useRef(false);
    useEffect(() => {
        // When speech transitions from speaking to not speaking, set autoListenPending
        if (wasSpeakingRef.current && !isSpeaking && voiceEnabled && isVoiceSupported && !isLoading && !isComplete) {
            setAutoListenPending(true);
        }
        wasSpeakingRef.current = isSpeaking;
    }, [isSpeaking, voiceEnabled, isVoiceSupported, isLoading, isComplete]);

    // Speak initial message
    useEffect(() => {
        if (voiceEnabled && isSpeechSupported && !hasSpokenInitial.current) {
            hasSpokenInitial.current = true;
            setTimeout(() => {
                speak(INITIAL_MESSAGE.content);
            }, 500);
        }
    }, [voiceEnabled, isSpeechSupported, speak]);

    // Auto-start listening after Pixo finishes speaking
    useEffect(() => {
        if (!isSpeaking && autoListenPending && voiceEnabled && isVoiceSupported && !isLoading && !isComplete) {
            setAutoListenPending(false);
            setTimeout(() => {
                startListening();
            }, 300);
        }
    }, [isSpeaking, autoListenPending, voiceEnabled, isVoiceSupported, isLoading, isComplete, startListening]);

    // Update input with voice transcript
    useEffect(() => {
        if (transcript) {
            setInputValue(transcript);
        }
    }, [transcript]);

    // Auto-send after voice input stops
    useEffect(() => {
        if (!isListening && transcript && transcript.trim().length > 0) {
            const timer = setTimeout(() => {
                handleSendMessage();
            }, 1000);
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, transcript]);

    const handleSendMessage = useCallback(async () => {
        const message = inputValue.trim();
        if (!message || isLoading) return;

        cancelSpeech();
        stopListening();

        const userMessage: ChatMessage = { role: 'user', content: message };
        const updatedHistory = [...conversationHistory, userMessage];
        setConversationHistory(updatedHistory);
        setInputValue('');
        resetTranscript();
        setIsLoading(true);

        try {
            const historyForApi = updatedHistory.filter(m => m.role === 'assistant' || m === userMessage);
            
            const response = await onboardingApi.chat({
                message,
                conversation_history: historyForApi.map(m => ({ role: m.role, content: m.content }))
            });

            const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
            setConversationHistory(prev => [...prev, assistantMessage]);
            setCurrentQuestion(response.response);
            setExtractedData(response.extracted_data);
            setIsComplete(response.is_complete);

            if (voiceEnabled && isSpeechSupported && !response.is_complete) {
                speak(response.response);
            }

            if (response.is_complete) {
                setTimeout(() => {
                    handleComplete();
                }, 3000);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = "Sorry, I had a little hiccup there. Could you try again?";
            setCurrentQuestion(errorMessage);
            if (voiceEnabled && isSpeechSupported) {
                speak(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, conversationHistory, isLoading, resetTranscript, voiceEnabled, isSpeechSupported, speak, cancelSpeech, stopListening]);

    const handleComplete = async () => {
        setIsCompleting(true);
        cancelSpeech();
        try {
            await onboardingApi.complete();
            onComplete();
        } catch (error) {
            console.error('Completion error:', error);
            setIsCompleting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCancelListening = () => {
        stopListening();
        resetTranscript();
        setInputValue('');
        inputRef.current?.focus();
    };

    const toggleVoice = () => {
        if (voiceEnabled) {
            cancelSpeech();
            stopListening();
        }
        setVoiceEnabled(!voiceEnabled);
    };

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    };

    // Calculate progress percentages
    const getProgress = () => {
        if (!extractedData) return { professional: 0, interests: 0, voice: 0 };

        const professionalFields = [
            extractedData.current_role,
            extractedData.industry,
            extractedData.expertise_areas.length > 0
        ];
        const professional = (professionalFields.filter(Boolean).length / 3) * 100;

        const interestFields = [
            extractedData.interests.length > 0,
            extractedData.topics_of_interest.length > 0
        ];
        const interests = (interestFields.filter(Boolean).length / 2) * 100;

        const toneFields = [
            extractedData.tone_formal_casual !== null,
            extractedData.tone_technical_simple !== null,
            extractedData.tone_serious_playful !== null,
            extractedData.tone_humble_confident !== null
        ];
        const voice = (toneFields.filter(Boolean).length / 4) * 100;

        return { professional, interests, voice };
    };

    const progress = getProgress();

    return (
        <div className="relative w-full h-full overflow-hidden flex flex-col">
            {/* Top bar with back button and voice toggle - Mobile optimized */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-slate-100 z-50">
                {/* Back button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center text-slate-500 hover:text-slate-700 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                )}
                {!onBack && <div />}
                
                {/* Voice toggle */}
                {(isSpeechSupported || isVoiceSupported) && (
                    <button
                        onClick={toggleVoice}
                        className={`p-2 rounded-lg transition-colors ${
                            voiceEnabled 
                                ? 'bg-cyan-100 text-cyan-600' 
                                : 'bg-slate-100 text-slate-400'
                        }`}
                        title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                    >
                        {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                )}
            </div>

            {/* Progress percentages - Responsive */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 sm:px-6 py-3">
                <div className="flex items-center justify-center gap-4 sm:gap-8">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Professional</span>
                        <span className="text-lg sm:text-xl font-bold text-slate-900">{Math.round(progress.professional)}%</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Interests</span>
                        <span className="text-lg sm:text-xl font-bold text-slate-900">{Math.round(progress.interests)}%</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Voice</span>
                        <span className="text-lg sm:text-xl font-bold text-slate-900">{Math.round(progress.voice)}%</span>
                    </div>
                </div>
            </div>

            {/* Main content - Scrollable on mobile */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                {/* Character and Question Area */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 px-4 sm:px-12 py-8 sm:py-12 min-h-full">
                    {/* Large Pixo Character */}
                    <div className="relative flex-shrink-0">
                        {/* Glow effect when speaking */}
                        {isSpeaking && (
                            <motion.div
                                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-cyan-400 rounded-full blur-3xl -z-10"
                                style={{ width: '300%', height: '300%', left: '-100%', top: '-100%' }}
                            />
                        )}

                        {/* Pixo Character - Responsive scale */}
                        <motion.div
                            className="scale-[1.5] sm:scale-[2]"
                            animate={
                                isSpeaking 
                                    ? { y: [0, -8, 0], scale: [1.5, 1.56, 1.5] }
                                    : isListening
                                        ? { rotate: [0, -5, 5, 0] }
                                        : {}
                            }
                            transition={{
                                duration: isSpeaking ? 0.5 : isListening ? 0.8 : 2,
                                repeat: isSpeaking || isListening ? Infinity : 0,
                                ease: "easeInOut"
                            }}
                        >
                            <PixoCharacter showBubbles={false} />
                        </motion.div>

                        {/* Listening indicator */}
                        {isListening && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute -bottom-12 sm:-bottom-16 left-1/2 -translate-x-1/2"
                            >
                                <div className="bg-red-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium flex items-center gap-2 sm:gap-3 shadow-xl whitespace-nowrap">
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="w-2 h-2 sm:w-3 sm:h-3 bg-white rounded-full"
                                    />
                                    Listening...
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Question text - Below character on mobile, beside on desktop */}
                    <motion.div
                        key={currentQuestion}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 max-w-2xl text-center sm:text-left mt-8 sm:mt-0"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center sm:justify-start gap-3 text-slate-600">
                                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                                <span className="text-lg sm:text-2xl font-light">Thinking...</span>
                            </div>
                        ) : (
                            <p className="text-lg sm:text-2xl text-slate-700 leading-relaxed font-light px-2 sm:px-0">
                                {currentQuestion}
                            </p>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Input area - Bottom with safe area padding */}
            <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 sm:p-6 pb-6 sm:pb-6">
                <div className="max-w-4xl mx-auto">
                    {/* Listening banner */}
                    {isListening && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 sm:mb-4"
                        >
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 sm:gap-3 text-red-600 text-sm sm:text-base font-medium">
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"
                                    />
                                    Listening...
                                </div>
                                <button
                                    onClick={handleCancelListening}
                                    className="text-xs sm:text-sm text-red-500 hover:text-red-700 flex items-center gap-1 sm:gap-2 font-medium"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="hidden sm:inline">Cancel & type</span>
                                    <span className="sm:hidden">Cancel</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    <div className="flex items-end gap-2 sm:gap-4">
                        {/* Voice input button */}
                        {isVoiceSupported && voiceEnabled && (
                            <button
                                onClick={handleMicClick}
                                disabled={isLoading || isComplete || isSpeaking}
                                className={`p-3 sm:p-4 rounded-xl transition-all flex-shrink-0 ${
                                    isListening
                                        ? 'bg-red-500 text-white animate-pulse shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                } disabled:opacity-50`}
                            >
                                {isListening ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </button>
                        )}

                        {/* Text input */}
                        <div className="flex-1 relative min-w-0">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    isSpeaking 
                                        ? "Pixo is speaking..." 
                                        : isListening 
                                            ? "Listening..." 
                                            : "Type your answer..."
                                }
                                disabled={isLoading || isComplete}
                                rows={1}
                                className="w-full px-3 sm:px-5 py-3 sm:py-4 pr-10 sm:pr-14 bg-slate-50 border-2 border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 text-sm sm:text-base"
                                style={{ minHeight: '48px', maxHeight: '120px' }}
                            />
                            {isListening && (
                                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                                    <div className="flex space-x-1">
                                        <div className="w-1 sm:w-1.5 h-3 sm:h-4 bg-red-500 rounded-full animate-pulse" />
                                        <div className="w-1 sm:w-1.5 h-4 sm:h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                                        <div className="w-1 sm:w-1.5 h-2 sm:h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Send button */}
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading || isComplete}
                            className="p-3 sm:p-4 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:hover:bg-slate-900 shadow-lg flex-shrink-0"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                            )}
                        </button>
                    </div>

                    {/* Voice hint - Hidden on mobile to save space */}
                    {isVoiceSupported && voiceEnabled && !isListening && !isSpeaking && (
                        <p className="hidden sm:block text-sm text-slate-400 mt-3 text-center">
                            Pixo will ask questions and auto-listen for your response
                        </p>
                    )}
                </div>
            </div>

            {/* Completion overlay */}
            {(isComplete || isCompleting) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-[100]"
                >
                    {isComplete && !isCompleting ? (
                        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center shadow-2xl">
                            <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-green-700 mb-2">All set!</h3>
                            <p className="text-lg text-green-600">Redirecting to dashboard...</p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-8 text-center shadow-2xl">
                            <Loader2 className="w-16 h-16 text-slate-600 mx-auto mb-4 animate-spin" />
                            <h3 className="text-2xl font-semibold text-slate-700 mb-2">Setting up your profile...</h3>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
