'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Renders an authored body the way a student will read it: KaTeX for the maths,
 * markdown images for the diagrams the author pasted in.
 *
 * `$…$` and `$$…$$` are the delimiters, which is what `remark-math` recognises by
 * default and what the app's `MathText` reads on the other side. KaTeX's stylesheet
 * is already imported globally in `globals.css`, so nothing needs loading per use.
 */
export default function MathText({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`math-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Author images are pasted screenshots of diagrams — they need a size
          // ceiling or one wide crop blows out the whole preview column.
          img: ({ node, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...props}
              alt={props.alt || 'Diagram'}
              className="my-2 max-h-64 max-w-full rounded-lg border border-[#262626] bg-white/5 object-contain"
            />
          ),
          p: ({ node, ...props }) => <p {...props} className="my-1.5 leading-relaxed" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
