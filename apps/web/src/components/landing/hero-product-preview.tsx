'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Inbox, 
  SwatchBook, 
  Calendar, 
  BarChart3, 
  Check, 
  X, 
  Pencil,
  Sparkles,
  Clock,
  TrendingUp,
  Zap,
  ChevronRight
} from 'lucide-react';

const tabs = [
  { id: 'inbox', label: 'Agent Inbox', icon: Inbox },
  { id: 'review', label: 'Swipe Review', icon: SwatchBook },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// Agent Inbox Tab Content
function AgentInboxContent() {
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-500">Agents working...</span>
        </div>
        <div className="px-2 py-1 bg-cyan-50 text-cyan-700 text-xs font-semibold rounded-full">
          4 drafts ready
        </div>
      </div>

      {/* Draft Cards */}
      {[
        { title: 'Why most founders fail at delegation', confidence: 94, time: '2 min ago', type: 'Thought Leadership' },
        { title: 'The 3 metrics that actually matter', confidence: 89, time: '15 min ago', type: 'Framework' },
        { title: 'Hot take: AI won\'t replace you', confidence: 91, time: '1 hr ago', type: 'Opinion' },
      ].map((draft, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`p-3 rounded-lg border ${i === 0 ? 'bg-white border-cyan-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{draft.type}</span>
                <span className="text-[10px] text-slate-300">•</span>
                <span className="text-[10px] text-slate-400">{draft.time}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate">{draft.title}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-semibold text-slate-600">{draft.confidence}%</span>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Bottom indicator */}
      <div className="pt-2 text-center">
        <p className="text-[10px] text-slate-400">Work is waiting. You just review.</p>
      </div>
    </div>
  );
}

// Swipe Review Tab Content
function SwipeReviewContent() {
  const [swipeState, setSwipeState] = useState<'idle' | 'left' | 'right' | 'up'>('idle');

  useEffect(() => {
    const sequence = ['right', 'idle', 'left', 'idle', 'up', 'idle'] as const;
    let index = 0;
    const interval = setInterval(() => {
      setSwipeState(sequence[index]);
      index = (index + 1) % sequence.length;
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 flex flex-col items-center justify-center h-full">
      {/* Swipe indicators */}
      <div className="flex items-center justify-between w-full mb-4 px-4">
        <div className={`flex items-center gap-1 transition-opacity ${swipeState === 'left' ? 'opacity-100' : 'opacity-30'}`}>
          <X className="w-4 h-4 text-red-500" />
          <span className="text-[10px] font-medium text-red-500">Reject</span>
        </div>
        <div className={`flex items-center gap-1 transition-opacity ${swipeState === 'up' ? 'opacity-100' : 'opacity-30'}`}>
          <Pencil className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-medium text-blue-500">Edit</span>
        </div>
        <div className={`flex items-center gap-1 transition-opacity ${swipeState === 'right' ? 'opacity-100' : 'opacity-30'}`}>
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-[10px] font-medium text-green-500">Approve</span>
        </div>
      </div>

      {/* Card */}
      <motion.div
        animate={{
          x: swipeState === 'left' ? -25 : swipeState === 'right' ? 25 : 0,
          y: swipeState === 'up' ? -20 : 0,
          rotate: swipeState === 'left' ? -5 : swipeState === 'right' ? 5 : 0,
          scale: swipeState !== 'idle' ? 0.98 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-full max-w-[260px] bg-white rounded-xl border border-slate-200 shadow-lg p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">LINKEDIN</span>
          <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded">94% MATCH</span>
        </div>
        <h4 className="text-sm font-bold text-slate-900 mb-2">The truth about "hustle culture"</h4>
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-slate-100 rounded" />
          <div className="h-2 w-5/6 bg-slate-100 rounded" />
          <div className="h-2 w-4/5 bg-slate-100 rounded" />
        </div>
      </motion.div>

      {/* Train indicator */}
      <p className="text-[10px] text-slate-400 mt-4">Every swipe trains your agent</p>
    </div>
  );
}

// Schedule Tab Content
function ScheduleContent() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const slots = [
    { day: 0, time: '9:00', filled: true, optimal: true },
    { day: 1, time: '12:00', filled: true, optimal: false },
    { day: 2, time: '9:00', filled: true, optimal: true },
    { day: 3, time: '15:00', filled: false, optimal: true },
    { day: 4, time: '9:00', filled: false, optimal: false },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-500" />
          <span className="text-xs font-semibold text-slate-700">Smart Scheduler</span>
        </div>
        <span className="text-[10px] text-slate-400">Agent-managed</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {days.map((day, i) => (
          <div key={day} className="text-center">
            <span className="text-[10px] font-medium text-slate-400">{day}</span>
            <div className={`mt-2 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 ${
              slots[i].filled 
                ? 'border-cyan-200 bg-cyan-50' 
                : slots[i].optimal 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-slate-200'
            }`}>
              {slots[i].filled ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[9px] text-cyan-600">{slots[i].time}</span>
                </>
              ) : slots[i].optimal ? (
                <>
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-[9px] text-green-600">Optimal</span>
                </>
              ) : (
                <span className="text-[9px] text-slate-300">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-slate-500">Scheduled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-500">Optimal slot</span>
        </div>
      </div>
    </div>
  );
}

// Analytics Tab Content
function AnalyticsContent() {
  const bars = [35, 42, 58, 45, 72, 68, 85];
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-700">Brand Reach</p>
          <p className="text-[10px] text-slate-400">Last 7 days</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span className="text-xs font-bold text-green-600">+127%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between h-32 gap-2 mb-6">
        {bars.map((height, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`flex-1 rounded-t ${i === bars.length - 1 ? 'bg-cyan-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Impressions', value: '24.5K', change: '+18%' },
          { label: 'Engagement', value: '3.2%', change: '+0.8%' },
          { label: 'Followers', value: '+847', change: '+12%' },
        ].map((stat, i) => (
          <div key={i} className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-sm font-bold text-slate-800">{stat.value}</p>
            <p className="text-[10px] text-slate-400">{stat.label}</p>
            <p className="text-[10px] text-green-600">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Learning indicator */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-[10px] text-slate-400">Agent learning from performance</span>
      </div>
    </div>
  );
}

const tabContent: Record<string, React.FC> = {
  inbox: AgentInboxContent,
  review: SwipeReviewContent,
  schedule: ScheduleContent,
  analytics: AnalyticsContent,
};

export function HeroProductPreview() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const cycleInterval = 3000; // 3 seconds per tab

  const nextTab = useCallback(() => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
    setProgress(0);
  }, [activeTab]);

  useEffect(() => {
    if (isPaused) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextTab();
          return 0;
        }
        return prev + (100 / (cycleInterval / 50));
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [isPaused, nextTab]);

  const ActiveContent = tabContent[activeTab];

  return (
    <div 
      className="w-full max-w-[580px] mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Browser Chrome */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden ring-1 ring-slate-900/5">
        {/* Title Bar */}
        <div className="h-11 bg-gradient-to-b from-slate-50 to-slate-100/80 border-b border-slate-200/80 flex items-center px-4 gap-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-[#28CA41] shadow-sm" />
          </div>
          <div className="ml-4 flex-1 h-7 bg-white rounded-lg border border-slate-200 flex items-center px-3 shadow-inner">
            <span className="text-[11px] text-slate-400 font-medium tracking-tight">app.pixo.ai</span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-100 bg-white">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setProgress(0);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                  isActive ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="h-[380px] bg-slate-50 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ActiveContent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
