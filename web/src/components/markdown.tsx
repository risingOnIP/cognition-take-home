import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders repo markdown (playbooks, bots, knowledge) with the platform's typography. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-6 text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _n, ...p }) => <h3 className="text-base font-semibold text-ink" {...p} />,
          h2: ({ node: _n, ...p }) => <h4 className="pt-2 font-semibold text-ink" {...p} />,
          h3: ({ node: _n, ...p }) => <h5 className="pt-1 font-medium text-ink" {...p} />,
          ul: ({ node: _n, ...p }) => <ul className="list-disc space-y-1 pl-5" {...p} />,
          ol: ({ node: _n, ...p }) => <ol className="list-decimal space-y-1 pl-5" {...p} />,
          a: ({ node: _n, ...p }) => <a className="text-brand-700 underline" target="_blank" rel="noreferrer" {...p} />,
          blockquote: ({ node: _n, ...p }) => <blockquote className="border-l-2 border-brand-500 bg-slate-50 px-3 py-2 italic" {...p} />,
          code: ({ node: _n, ...p }) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-ink" {...p} />,
          pre: ({ node: _n, ...p }) => <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-slate-100 [&_code]:bg-transparent [&_code]:text-slate-100" {...p} />,
          table: ({ node: _n, ...p }) => <table className="w-full border-collapse text-left text-xs" {...p} />,
          th: ({ node: _n, ...p }) => <th className="border-b border-line px-2 py-1.5 font-semibold" {...p} />,
          td: ({ node: _n, ...p }) => <td className="border-b border-line px-2 py-1.5 align-top" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
