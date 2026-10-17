import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="space-y-3 break-words leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-3">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          table: ({ children }) => (
            <div
              className="max-w-full overflow-x-auto rounded-lg border border-border"
              tabIndex={0}
              role="region"
              aria-label="Tabel jawaban AI"
            >
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          th: ({ children, style }) => (
            <th
              style={style}
              className="border-b border-border bg-secondary px-4 py-2 font-semibold"
            >
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td style={style} className="border-b border-border px-4 py-2 align-top">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
