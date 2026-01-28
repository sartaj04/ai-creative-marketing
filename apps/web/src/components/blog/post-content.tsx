'use client';

import ReactMarkdown from 'react-markdown';

interface PostContentProps {
  content: string;
}

export function PostContent({ content }: PostContentProps) {
  return (
    <article className="prose prose-slate prose-lg max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-semibold text-slate-900 mt-12 mb-6">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-slate-900 mt-10 mb-4">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-slate-600 leading-relaxed mb-6">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-slate-600">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-slate-600">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-cyan-500 pl-6 my-8 italic text-slate-600 bg-slate-50 py-4 pr-6 rounded-r-lg">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-cyan-600 hover:text-cyan-700 underline underline-offset-2"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto mb-6">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-12 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
