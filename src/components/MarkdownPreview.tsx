import React from 'react';

interface MarkdownPreviewProps {
  content: string;
  isLightPaper: boolean;
  fontSize: number;
  isMonospace?: boolean;
}

function renderInline(text: string, isLightPaper: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key++} className="italic opacity-90">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key++}
          className={`font-mono text-[0.88em] px-1.5 py-0.5 rounded-md ${
            isLightPaper
              ? 'bg-[#0b1214]/10 text-[#0b1214]'
              : 'bg-[#142225] text-[var(--accent)] border border-[#1b2c2e]'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  isLightPaper,
  fontSize,
  isMonospace,
}) => {
  if (!content.trim()) {
    return (
      <p className="text-sm opacity-45 py-4">
        Bu notta henüz metin bulunmuyor.
      </p>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${i}`}
            className={`font-mono text-xs sm:text-sm p-3.5 rounded-2xl overflow-x-auto border ${
              isLightPaper
                ? 'bg-[#0b1214]/5 border-[#84a0a0]/30 text-[#0b1214]'
                : 'bg-[#070b0c] border-[#1b2c2e] text-[var(--accent)]'
            }`}
          >
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="font-display text-lg font-semibold pt-2">
          {renderInline(line.slice(4), isLightPaper)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="font-display text-xl font-semibold pt-2">
          {renderInline(line.slice(3), isLightPaper)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="font-display text-2xl font-semibold pt-2">
          {renderInline(line.slice(2), isLightPaper)}
        </h1>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          className={`pl-3.5 border-l-2 border-[var(--accent)] opacity-85 italic py-0.5 ${
            isLightPaper ? 'text-[#0b1214]' : 'text-[#e6f2f2]'
          }`}
        >
          {renderInline(line.slice(2), isLightPaper)}
        </blockquote>
      );
    } else if (/^([-*•])\s+/.test(line)) {
      const clean = line.replace(/^([-*•])\s+/, '');
      elements.push(
        <div key={i} className="flex items-start gap-2.5 pl-1">
          <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
          <span className="leading-[30px]">{renderInline(clean, isLightPaper)}</span>
        </div>
      );
    } else if (line.trim() === '---') {
      elements.push(
        <hr
          key={i}
          className={`my-3 ${
            isLightPaper ? 'border-[#84a0a0]/30' : 'border-[#1b2c2e]'
          }`}
        />
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />);
    } else {
      elements.push(
        <p key={i} className="leading-[32px] whitespace-pre-wrap break-words">
          {renderInline(line, isLightPaper)}
        </p>
      );
    }
  }

  return (
    <div
      style={{ fontSize: `${fontSize}px` }}
      className={`space-y-1.5 ${isMonospace ? 'font-mono' : ''}`}
    >
      {elements}
    </div>
  );
};
