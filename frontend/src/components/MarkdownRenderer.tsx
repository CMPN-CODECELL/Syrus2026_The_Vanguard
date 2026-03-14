'use client';

import React from 'react';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

/**
 * Simple Markdown Renderer Component
 * Renders markdown content with basic styling support.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
    className = ''
}) => {
    const renderMarkdown = (text: string): string => {
        if (!text) return '';

        let html = text
            // Escape HTML first
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')

            // Headers
            .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')

            // Bold and italic
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')

            // Code blocks
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="md-code-block"><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')

            // Blockquotes with special alerts
            .replace(/&gt; \[!IMPORTANT\]\n&gt; (.+)/g, '<div class="md-alert md-alert-important"><strong>Important:</strong> $1</div>')
            .replace(/&gt; \[!WARNING\]\n&gt; (.+)/g, '<div class="md-alert md-alert-warning"><strong>Warning:</strong> $1</div>')
            .replace(/&gt; \[!NOTE\]\n&gt; (.+)/g, '<div class="md-alert md-alert-note"><strong>Note:</strong> $1</div>')
            .replace(/&gt; (.+)/g, '<blockquote class="md-blockquote">$1</blockquote>')

            // Unordered lists
            .replace(/^- (.+)$/gm, '<li class="md-li">$1</li>')
            .replace(/^\* (.+)$/gm, '<li class="md-li">$1</li>')

            // Ordered lists
            .replace(/^\d+\. (.+)$/gm, '<li class="md-li-ordered">$1</li>')

            // Horizontal rules
            .replace(/^---$/gm, '<hr class="md-hr" />')

            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>')

            // Paragraphs (double newlines)
            .replace(/\n\n/g, '</p><p class="md-p">')

            // Single newlines to <br> only within paragraphs
            .replace(/\n/g, '<br/>');

        // Wrap in paragraph
        html = `<p class="md-p">${html}</p>`;

        // Clean up empty paragraphs
        html = html.replace(/<p class="md-p"><\/p>/g, '');

        return html;
    };

    return (
        <div
            className={`markdown-content ${className}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            style={{
                lineHeight: 1.6,
                color: 'var(--text-primary, #1a1a2e)'
            }}
        />
    );
};

// Styles to be included in global CSS or component
export const markdownStyles = `
  .markdown-content .md-h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 1.5rem 0 1rem;
    color: #1a1a2e;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0.5rem;
  }
  
  .markdown-content .md-h2 {
    font-size: 1.35rem;
    font-weight: 600;
    margin: 1.25rem 0 0.75rem;
    color: #2d3748;
  }
  
  .markdown-content .md-h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem;
    color: #4a5568;
  }
  
  .markdown-content .md-p {
    margin: 0.75rem 0;
  }
  
  .markdown-content .md-li {
    margin-left: 1.5rem;
    padding: 0.25rem 0;
    display: list-item;
    list-style-type: disc;
  }
  
  .markdown-content .md-li-ordered {
    margin-left: 1.5rem;
    padding: 0.25rem 0;
    display: list-item;
    list-style-type: decimal;
  }
  
  .markdown-content .md-code-block {
    background: #1a1a2e;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.875rem;
    margin: 1rem 0;
  }
  
  .markdown-content .md-inline-code {
    background: rgba(74, 111, 165, 0.1);
    color: #4a6fa5;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.875em;
  }
  
  .markdown-content .md-blockquote {
    border-left: 4px solid #4a6fa5;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #4a5568;
    font-style: italic;
  }
  
  .markdown-content .md-hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 1.5rem 0;
  }
  
  .markdown-content .md-link {
    color: #4a6fa5;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  
  .markdown-content .md-link:hover {
    color: #3a5985;
  }
  
  .markdown-content .md-alert {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .markdown-content .md-alert-important {
    background: rgba(204, 85, 0, 0.1);
    border-left: 4px solid #cc5500;
    color: #b54a00;
  }
  
  .markdown-content .md-alert-warning {
    background: rgba(234, 179, 8, 0.1);
    border-left: 4px solid #eab308;
    color: #a16207;
  }
  
  .markdown-content .md-alert-note {
    background: rgba(74, 111, 165, 0.1);
    border-left: 4px solid #4a6fa5;
    color: #3a5985;
  }
`;

export default MarkdownRenderer;
