'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

interface UseSpeechRecognitionReturn {
    isListening: boolean;
    transcript: string;
    isSupported: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognitionAPI) {
            setIsSupported(false);
            return;
        }

        setIsSupported(true);
        const recognition = new SpeechRecognitionAPI();
        
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            // Use final transcript if available, otherwise use interim
            setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setError(event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const start = useCallback(() => {
        if (!recognitionRef.current || isListening) return;
        
        try {
            setError(null);
            recognitionRef.current.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setError('Failed to start speech recognition');
        }
    }, [isListening]);

    const stop = useCallback(() => {
        if (!recognitionRef.current || !isListening) return;
        
        try {
            recognitionRef.current.stop();
        } catch (err) {
            console.error('Failed to stop speech recognition:', err);
        }
    }, [isListening]);

    const reset = useCallback(() => {
        setTranscript('');
        setError(null);
    }, []);

    return {
        isListening,
        transcript,
        isSupported,
        start,
        stop,
        reset,
        error
    };
}
