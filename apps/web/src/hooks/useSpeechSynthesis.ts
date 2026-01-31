'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechSynthesisReturn {
    speak: (text: string) => void;
    cancel: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initialize and load voices
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setIsSupported(false);
            return;
        }

        setIsSupported(true);

        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };

        // Load voices immediately if available
        loadVoices();

        // Also listen for voiceschanged event (needed for Chrome)
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        };
    }, []);

    // Get the best available friendly voice
    const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
        if (voices.length === 0) return null;

        // Priority list of friendly-sounding voices
        const preferredVoices = [
            // Google voices (usually high quality)
            'Google US English',
            'Google UK English Female',
            // Apple voices
            'Samantha',
            'Karen',
            'Moira',
            // Microsoft voices
            'Microsoft Zira',
            'Microsoft Jenny',
            // Generic English female voices
            'female',
            'en-US',
            'en-GB',
        ];

        // Try to find a preferred voice
        for (const preferred of preferredVoices) {
            const found = voices.find(
                (v) =>
                    v.name.toLowerCase().includes(preferred.toLowerCase()) ||
                    v.lang.includes(preferred)
            );
            if (found) return found;
        }

        // Fallback to any English voice
        const englishVoice = voices.find((v) => v.lang.startsWith('en'));
        if (englishVoice) return englishVoice;

        // Last resort: first available voice
        return voices[0];
    }, [voices]);

    const speak = useCallback(
        (text: string) => {
            if (!isSupported || !window.speechSynthesis) return;

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utteranceRef.current = utterance;

            // Set voice
            const voice = getBestVoice();
            if (voice) {
                utterance.voice = voice;
            }

            // Configure speech parameters for friendly tone
            utterance.rate = 1.0; // Normal speed
            utterance.pitch = 1.1; // Slightly higher pitch for friendliness
            utterance.volume = 1.0;

            utterance.onstart = () => {
                setIsSpeaking(true);
            };

            utterance.onend = () => {
                setIsSpeaking(false);
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event.error);
                setIsSpeaking(false);
            };

            window.speechSynthesis.speak(utterance);
        },
        [isSupported, getBestVoice]
    );

    const cancel = useCallback(() => {
        if (!isSupported || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [isSupported]);

    return {
        speak,
        cancel,
        isSpeaking,
        isSupported,
    };
}
