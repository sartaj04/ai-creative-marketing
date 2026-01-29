'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Briefcase, Building2, Clock, Lightbulb, Trophy } from 'lucide-react';
import { ProfessionalStepData } from '@/lib/api/onboarding';

// Industry options
const INDUSTRIES = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Marketing',
    'Consulting', 'E-commerce', 'Media & Entertainment', 'Real Estate',
    'Manufacturing', 'Legal', 'Non-profit', 'Government', 'Other'
];

// Years of experience options
const EXPERIENCE_LEVELS = [
    { value: '0-2', label: '0-2 years (Early career)' },
    { value: '3-5', label: '3-5 years (Rising professional)' },
    { value: '6-10', label: '6-10 years (Mid-career)' },
    { value: '11-15', label: '11-15 years (Senior)' },
    { value: '15+', label: '15+ years (Executive/Expert)' }
];

// Skills/expertise options
const EXPERTISE_OPTIONS = [
    'Leadership', 'Strategy', 'Product Management', 'Software Engineering',
    'Data Science', 'Marketing', 'Sales', 'Operations', 'Finance',
    'Design', 'Content Creation', 'Business Development', 'Consulting',
    'Project Management', 'Analytics', 'AI/Machine Learning', 'Cloud Computing',
    'Entrepreneurship', 'Public Speaking', 'Writing'
];

interface ProfessionalStepProps {
    onComplete: (data: ProfessionalStepData) => void;
}

type Question = {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
};

const QUESTIONS: Question[] = [
    {
        id: 'role',
        title: 'What is your current role?',
        subtitle: 'This helps us understand your professional identity',
        icon: <Briefcase className="w-5 h-5" />
    },
    {
        id: 'industry',
        title: 'What industry do you work in?',
        subtitle: 'Select the industry that best describes your work',
        icon: <Building2 className="w-5 h-5" />
    },
    {
        id: 'experience',
        title: 'How many years of experience do you have?',
        subtitle: 'This helps us tailor content to your career stage',
        icon: <Clock className="w-5 h-5" />
    },
    {
        id: 'expertise',
        title: 'What are your key areas of expertise?',
        subtitle: 'Select 3-5 skills you want to be known for',
        icon: <Lightbulb className="w-5 h-5" />
    },
    {
        id: 'highlight',
        title: 'What\'s your proudest professional achievement?',
        subtitle: 'Optional: Share a highlight that defines your career',
        icon: <Trophy className="w-5 h-5" />
    }
];

export function ProfessionalStep({ onComplete }: ProfessionalStepProps) {
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [formData, setFormData] = useState({
        current_role: '',
        industry: '',
        years_experience: '',
        expertise_areas: [] as string[],
        career_highlight: ''
    });

    const currentQuestion = QUESTIONS[currentQIndex];

    const handleNext = () => {
        if (currentQIndex < QUESTIONS.length - 1) {
            setDirection(1);
            setCurrentQIndex(prev => prev + 1);
        } else {
            // Complete the step
            onComplete({
                current_role: formData.current_role,
                industry: formData.industry,
                years_experience: formData.years_experience,
                expertise_areas: formData.expertise_areas,
                career_highlight: formData.career_highlight || undefined
            });
        }
    };

    const handleBack = () => {
        if (currentQIndex > 0) {
            setDirection(-1);
            setCurrentQIndex(prev => prev - 1);
        }
    };

    const canProceed = () => {
        switch (currentQuestion.id) {
            case 'role':
                return formData.current_role.trim().length > 0;
            case 'industry':
                return formData.industry.length > 0;
            case 'experience':
                return formData.years_experience.length > 0;
            case 'expertise':
                return formData.expertise_areas.length >= 3;
            case 'highlight':
                return true; // Optional
            default:
                return false;
        }
    };

    const toggleExpertise = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            expertise_areas: prev.expertise_areas.includes(skill)
                ? prev.expertise_areas.filter(s => s !== skill)
                : prev.expertise_areas.length < 5
                    ? [...prev.expertise_areas, skill]
                    : prev.expertise_areas
        }));
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -50 : 50,
            opacity: 0
        })
    };

    return (
        <div className="w-full">
            <div className="mb-8">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Question {currentQIndex + 1} of {QUESTIONS.length}
                </span>
            </div>

            <div className="relative min-h-[400px]">
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={currentQuestion.id}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                                {currentQuestion.icon}
                            </div>
                            <h3 className="text-2xl font-light text-slate-900">{currentQuestion.title}</h3>
                        </div>
                        <p className="text-slate-500 mb-8 text-lg ml-13">{currentQuestion.subtitle}</p>

                        {/* Question Inputs */}
                        <div className="min-h-[200px]">
                            {currentQuestion.id === 'role' && (
                                <input
                                    type="text"
                                    value={formData.current_role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, current_role: e.target.value }))}
                                    placeholder="e.g., Product Manager, Software Engineer, Marketing Director"
                                    className="w-full p-4 text-lg text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                />
                            )}

                            {currentQuestion.id === 'industry' && (
                                <div className="flex flex-wrap gap-3">
                                    {INDUSTRIES.map(industry => {
                                        const selected = formData.industry === industry;
                                        return (
                                            <button
                                                key={industry}
                                                onClick={() => setFormData(prev => ({ ...prev, industry }))}
                                                className={`px-5 py-3 rounded-full text-sm font-medium transition-all duration-200
                                                    ${selected
                                                        ? 'bg-slate-900 text-white shadow-md scale-105'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                            >
                                                {industry}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {currentQuestion.id === 'experience' && (
                                <div className="space-y-3">
                                    {EXPERIENCE_LEVELS.map(level => {
                                        const selected = formData.years_experience === level.value;
                                        return (
                                            <button
                                                key={level.value}
                                                onClick={() => setFormData(prev => ({ ...prev, years_experience: level.value }))}
                                                className={`w-full p-4 rounded-xl text-left font-medium transition-all duration-200
                                                    ${selected
                                                        ? 'bg-slate-900 text-white shadow-md'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                            >
                                                {level.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {currentQuestion.id === 'expertise' && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Selected: {formData.expertise_areas.length}/5 (minimum 3)
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        {EXPERTISE_OPTIONS.map(skill => {
                                            const selected = formData.expertise_areas.includes(skill);
                                            return (
                                                <button
                                                    key={skill}
                                                    onClick={() => toggleExpertise(skill)}
                                                    className={`px-5 py-3 rounded-full text-sm font-medium transition-all duration-200
                                                        ${selected
                                                            ? 'bg-slate-900 text-white shadow-md scale-105'
                                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                                >
                                                    {skill}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {currentQuestion.id === 'highlight' && (
                                <textarea
                                    value={formData.career_highlight}
                                    onChange={(e) => setFormData(prev => ({ ...prev, career_highlight: e.target.value }))}
                                    placeholder="e.g., Led a team that increased revenue by 200%, Built a product used by 1M+ users..."
                                    rows={4}
                                    className="w-full p-4 text-lg text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all"
                                />
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-8 mt-4 border-t border-slate-100">
                <button
                    onClick={handleBack}
                    disabled={currentQIndex === 0}
                    className="flex items-center text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </button>

                <button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-medium flex items-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {currentQIndex === QUESTIONS.length - 1 ? 'Continue' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </button>
            </div>
        </div>
    );
}
