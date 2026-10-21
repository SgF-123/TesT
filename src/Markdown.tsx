import { memo, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Copy } from "lucide-react";

function openExternal(url: string) {
  if (!url) {
    return;
  }
  if (window.tesT?.openExternal) {
    void window.tesT.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function renderInline(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\)|https?:\/\/[^\s<]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    const key = `${prefix}-i-${index++}`;
    if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code className="md-inline-code" key={key}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={key}
            href={link[2]}
            className="md-link"
            onClick={(event) => {
              event.preventDefault();
              openExternal(link[2]);
            }}
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <a
          key={key}
          href={token}
          className="md-link"
          onClick={(event) => {
            event.preventDefault();
            openExternal(token);
          }}
        >
          {token}
        </a>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "def",
  "default",
  "delete",
  "do",
  "elif",
  "else",
  "enum",
  "except",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "fn",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "match",
  "namespace",
  "new",
  "null",
  "of",
  "package",
  "private",
  "protected",
  "pub",
  "public",
  "raise",
  "readonly",
  "return",
  "self",
  "static",
  "struct",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "use",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "None",
  "True",
  "False",
  "and",
  "or",
  "not",
  "lambda",
  "pass",
  "global",
  "nonlocal",
  "print",
  "echo",
  "cd",
  "export",
]);

function highlightCode(code: string, language: string) {
  const lang = String(language || "").toLowerCase();
  const hashComments = [
    "py",
    "python",
    "sh",
    "bash",
    "shell",
    "ps1",
    "powershell",
    "yaml",
    "yml",
    "toml",
    "ruby",
    "rb",
  ].includes(lang);
  const source =
    `(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*` +
    (hashComments ? `|#[^\\n]*` : "") +
    `|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\\`(?:\\\\.|[^\\\`\\\\])*\\\`` +
    `|\\b\\d+(?:\\.\\d+)?\\b|\\b[A-Za-z_$][\\w$]*\\b)`;
  let pattern: RegExp;
  try {
    pattern = new RegExp(source, "g");
  } catch {
    return code;
  }
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code))) {
    if (match.index > last) {
      nodes.push(code.slice(last, match.index));
    }
    const token = match[0];
    const key = `t-${index++}`;
    let className = "";
    if (
      token.startsWith("//") ||
      token.startsWith("/*") ||
      (hashComments && token.startsWith("#"))
    ) {
      className = "tok-comment";
    } else if (
      token.startsWith('"') ||
      token.startsWith("'") ||
      token.startsWith("`")
    ) {
      className = "tok-string";
    } else if (/^\d/.test(token)) {
      className = "tok-number";
    } else if (KEYWORDS.has(token)) {
      className = "tok-keyword";
    } else if (code[match.index + token.length] === "(") {
      className = "tok-function";
    }
    nodes.push(
      className ? (
        <span className={className} key={key}>
          {token}
        </span>
      ) : (
        token
      ),
    );
    last = match.index + token.length;
  }
  if (last < code.length) {
    nodes.push(code.slice(last));
  }
  return nodes;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const highlighted = useMemo(
    () => highlightCode(code, language),
    [code, language],
  );
  return (
    <div className="md-code">
      <div className="md-code-head">
        <span>{language || "text"}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            } catch {
              // Clipboard may be unavailable; keep the button silent.
            }
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre>
        <code>{highlighted}</code>
      </pre>
    </div>
  );
}

function isBlockStart(line: string) {
  return (
    /^\s*```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*(---|\*\*\*|___)\s*$/.test(line)
  );
}

export default memo(function MarkdownText({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = String(text || "").split(/\r?\n/);
    const blocks: ReactNode[] = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

    const fence = /^\s*```([A-Za-z0-9_+.#-]*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push(
        <CodeBlock
          key={`code-${index}`}
          language={fence[1]}
          code={body.join("\n")}
        />,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(6, heading[1].length);
      const content = renderInline(
        heading[2],
        `h-${index}`,
      );
      if (level === 1) {
        blocks.push(<h1 key={`h-${index}`}>{content}</h1>);
      } else if (level === 2) {
        blocks.push(<h2 key={`h-${index}`}>{content}</h2>);
      } else {
        blocks.push(<h3 key={`h-${index}`}>{content}</h3>);
      }
      index += 1;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={`hr-${index}`} />);
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`q-${index}`}>
          {renderInline(body.join(" "), `q-${index}`)}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`li-${index}-${itemIndex}`}>
              {renderInline(item, `li-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`oli-${index}-${itemIndex}`}>
              {renderInline(item, `oli-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (paragraph.length > 0) {
      blocks.push(
        <p key={`p-${index}`}>
          {renderInline(paragraph.join("\n"), `p-${index}`)}
        </p>,
      );
    } else {
      index += 1;
    }
    }

    return blocks;
  }, [text]);

  return <div className="md">{blocks}</div>;
});
