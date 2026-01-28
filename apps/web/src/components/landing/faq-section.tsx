'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'How does Pixo learn my brand voice?',
    answer: 'Pixo builds a Unified Identity Graph from your LinkedIn profile, website, resume, and posting history. Our agents analyze your tone, expertise areas, and communication style automatically — no manual setup required.',
  },
  {
    question: 'How is this different from ChatGPT or other AI writers?',
    answer: 'ChatGPT requires you to prompt it every time. Pixo\'s agents work proactively in the background 24/7 — when you open the app, ready drafts are already waiting. You\'re a curator, not a creator.',
  },
  {
    question: 'How does the workflow change?',
    answer: 'Instead of starting from scratch, you review what agents have prepared and approve with a swipe. Your creative energy goes where it matters — refining and directing, not grinding.',
  },
  {
    question: 'Can I edit drafts before publishing?',
    answer: 'Absolutely. Swipe up on any draft to edit it. Your edits also train the agent — it learns your preferences and improves over time.',
  },
  {
    question: 'Does Pixo work for teams and companies?',
    answer: 'Yes. Pixo supports both personal brands and enterprises. For teams, you get unified brand voice across all members, ICP-aware positioning, and centralized management.',
  },
  {
    question: 'Which platforms does Pixo support?',
    answer: 'We currently support LinkedIn and Twitter/X, with more platforms coming soon. All drafts are optimized for each platform\'s best practices.',
  },
];

function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-slate-900 group-hover:text-cyan-600 transition-colors pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-slate-600 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 px-6 md:px-12 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-slate-500">
            Everything you need to know about Pixo.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-200 px-6">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
