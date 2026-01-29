'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { messageVariants, prefersReducedMotion } from './motion-variants';

export interface MessageContent {
  type: 'text' | 'component';
  content: string | ReactNode;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  richContent?: ReactNode; // Optional rich content (cards, helpers, etc.)
}

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
}

export function ChatMessage({ message, isLatest = false }: ChatMessageProps) {
  const reducedMotion = prefersReducedMotion();
  const isUser = message.role === 'user';

  return (
    <motion.div
      variants={messageVariants}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      exit="exit"
      layout
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div className="flex flex-col max-w-[85%] md:max-w-[75%]">
        {/* Main message bubble */}
        <div
          className={cn(
            'px-4 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-slate-900 text-white rounded-tr-sm'
              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
          )}
        >
          {message.content}
        </div>
        
        {/* Rich content (rendered below the message bubble) */}
        {message.richContent && (
          <div className="mt-3">
            {message.richContent}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Wrapper for staggered message list
interface MessageListProps {
  messages: Message[];
  children?: ReactNode;
}

export function MessageList({ messages, children }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => (
        <ChatMessage 
          key={idx} 
          message={msg} 
          isLatest={idx === messages.length - 1}
        />
      ))}
      {children}
    </div>
  );
}
