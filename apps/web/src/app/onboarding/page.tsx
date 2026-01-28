'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, ChevronRight, Upload, Globe, Linkedin, FileText, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  { id: 1, title: 'Profile Source', desc: 'Where should we learn about you?' },
  { id: 2, title: 'Experience', desc: 'Add context from your resume or bio' },
  { id: 3, title: 'Tone & Style', desc: 'How do you want to sound?' },
  { id: 4, title: 'Analysis', desc: 'Building your identity graph...' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isanalyzing, setIsAnalyzing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    linkedin: '',
    website: '',
    bio: '',
    style: 'Professional'
  });

  const handleNext = async () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Start Analysis Simulation
      setCurrentStep(4);
      setIsAnalyzing(true);

      // Simulate AI processing time
      setTimeout(() => {
        router.push('/dashboard/inbox');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-16 px-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-white to-transparent -z-10" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -z-10" />

      <div className="w-full max-w-4xl space-y-12 z-10">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Let's build your Agentic Identity</h1>
          <p className="text-slate-500 text-lg">We need a few details to train your personal model.</p>
        </div>

        {/* Progress */}
        <div className="flex justify-between items-center relative max-w-2xl mx-auto">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-cyan-600 -z-10 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-3 relative group">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 shadow-sm z-10 ${step.id <= currentStep
                  ? 'bg-cyan-600 border-cyan-600 text-white shadow-cyan-600/25'
                  : 'bg-white border-slate-200 text-slate-300'
                  }`}
              >
                {step.id < currentStep ? <Check className="w-6 h-6" /> : <span className="font-semibold">{step.id}</span>}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider absolute -bottom-8 w-32 text-center transition-colors ${step.id <= currentStep ? 'text-cyan-700' : 'text-slate-400'}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Form Area */}
        <div className="pt-8">
          <AnimatePresence mode='wait'>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-xl">
                {currentStep < 4 ? (
                  <>
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-8">
                      <CardTitle className="text-2xl text-slate-900">{steps[currentStep - 1].title}</CardTitle>
                      <CardDescription className="text-base text-slate-500">{steps[currentStep - 1].desc}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 min-h-[320px]">
                      {currentStep === 1 && (
                        <div className="space-y-6 max-w-xl mx-auto">
                          <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Linkedin className="w-4 h-4 text-[#0077b5]" /> LinkedIn Profile
                            </label>
                            <Input
                              placeholder="https://linkedin.com/in/username"
                              className="h-12 bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                              value={formData.linkedin}
                              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                            />
                            <p className="text-xs text-slate-500">We analyze your experience and endorsements.</p>
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Globe className="w-4 h-4 text-cyan-500" /> Personal Website (Optional)
                            </label>
                            <Input
                              placeholder="https://yourwebsite.com"
                              className="h-12 bg-white border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                              value={formData.website}
                              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {currentStep === 2 && (
                        <div className="space-y-8 max-w-xl mx-auto">
                          <div className="group border-2 border-dashed border-slate-200 rounded-2xl p-10 hover:border-cyan-400 hover:bg-cyan-50/30 transition-all cursor-pointer text-center">
                            <div className="w-16 h-16 bg-blue-50 text-cyan-600 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                              <Upload className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Resume / CV</h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto">
                              Drag & drop PDF here. We verify your expertise depth.
                            </p>
                          </div>

                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-3 text-slate-400 font-medium">Or paste bio</span>
                            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-slate-100" />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Short Bio</label>
                            <Textarea
                              placeholder="I am a product manager with 10 years of experience in..."
                              className="resize-none min-h-[100px] bg-slate-50 border-slate-200 focus:border-cyan-500"
                              value={formData.bio}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, bio: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                          {[
                            { name: 'Professional', desc: 'Credible, clear, and authoritative.', icon: '👔' },
                            { name: 'Conversational', desc: 'Approachable, friendly, and engaging.', icon: '👋' },
                            { name: 'Thought Leader', desc: 'Bold, opinionated, and visionary.', icon: '💡' },
                            { name: 'Detailed', desc: 'Analytical, data-driven, and thorough.', icon: '📊' }
                          ].map((style) => (
                            <div
                              key={style.name}
                              onClick={() => setFormData({ ...formData, style: style.name })}
                              className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${formData.style === style.name
                                ? 'border-cyan-500 bg-cyan-50/50 shadow-md shadow-cyan-900/5'
                                : 'border-slate-100 hover:border-cyan-200 hover:bg-slate-50'
                                }`}
                            >
                              <div className="flex items-start gap-4">
                                <span className="text-2xl">{style.icon}</span>
                                <div>
                                  <div className={`font-semibold ${formData.style === style.name ? 'text-cyan-900' : 'text-slate-900'}`}>
                                    {style.name}
                                  </div>
                                  <div className="text-sm text-slate-500 mt-1">{style.desc}</div>
                                </div>
                                {formData.style === style.name && <Check className="w-5 h-5 text-cyan-600 ml-auto" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-6 flex justify-between">
                      <Button
                        variant="ghost"
                        disabled={currentStep === 1}
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="text-slate-500 hover:text-slate-900"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button
                        onClick={handleNext}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 h-11 shadow-lg shadow-cyan-600/20"
                      >
                        {currentStep === 3 ? 'Generate Agent' : 'Continue'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </>
                ) : (
                  <CardContent className="p-16 flex flex-col items-center justify-center min-h-[500px] text-center">
                    <div className="relative w-24 h-24 mb-8">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                      <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-cyan-500 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing your digital footprint...</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                      We're scanning your provided links and resume to construct your unique Identity Graph. This usually takes about 10 seconds.
                    </p>

                    <div className="w-full max-w-md space-y-3 text-left">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500" /> Verifying LinkedIn profile
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500" /> Extracting core expertise topics
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" /> Generating voice model
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
