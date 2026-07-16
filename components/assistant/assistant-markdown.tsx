import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AssistantMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1.5 mt-3 font-semibold first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
        blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-brand-300 pl-3 text-ink-muted">{children}</blockquote>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-600 underline underline-offset-2">{children}</a>,
        code: ({ children }) => <code className="rounded bg-ink/5 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
        pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-ink p-3 text-xs text-white">{children}</pre>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
