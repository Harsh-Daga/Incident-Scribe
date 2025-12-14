'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mb-3 mt-5 first:mt-0" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0" style={{ color: 'var(--accent-cyan)' }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mb-2 mt-3" style={{ color: 'var(--accent-cyan)' }}>
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-sm" style={{ color: 'var(--text-secondary)' }}>
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="mb-4 ml-4 space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-4 space-y-2 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-cyan)' }} />
              <span>{children}</span>
            </li>
          ),
          
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {children}
            </strong>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic" style={{ color: 'var(--accent-amber)' }}>
              {children}
            </em>
          ),
          
          // Code blocks
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{ 
                    background: 'rgba(6, 182, 212, 0.1)', 
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(6, 182, 212, 0.2)'
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3"
                style={{ 
                  background: 'var(--bg-primary)', 
                  color: 'var(--accent-emerald)',
                  border: '1px solid var(--glass-border)'
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          
          // Pre blocks (code containers)
          pre: ({ children }) => (
            <pre className="mb-4 rounded-lg overflow-hidden">
              {children}
            </pre>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote 
              className="pl-4 py-2 mb-4 italic"
              style={{ 
                borderLeft: '3px solid var(--accent-magenta)',
                background: 'rgba(236, 72, 153, 0.05)',
                color: 'var(--text-secondary)'
              }}
            >
              {children}
            </blockquote>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-0 h-px" style={{ background: 'var(--glass-border)' }} />
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors"
              style={{ color: 'var(--accent-cyan)' }}
            >
              {children}
            </a>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th 
              className="px-3 py-2 text-left font-semibold text-xs"
              style={{ 
                color: 'var(--accent-cyan)',
                borderBottom: '1px solid var(--glass-border)'
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td 
              className="px-3 py-2 text-sm"
              style={{ 
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--glass-border)'
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

