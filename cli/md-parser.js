/* Markdown parser -- Node.js CommonJS port extracted from ../pwa/app.js
   Logic is identical to the browser version; zero browser API dependencies. */

'use strict';

// Parse inline formatting: bold, italic, code, links
function parseInline(text) {
  const runs = [];
  let buffer = '';
  let i = 0;

  function flushBuffer() {
    if (buffer) runs.push({ text: buffer });
    buffer = '';
  }

  while (i < text.length) {
    // Bold **text**
    if (text[i] === '*' && text[i + 1] === '*') {
      flushBuffer();
      i += 2;
      let boldText = '';
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
        boldText += text[i++];
      }
      i += 2;
      runs.push({ text: boldText, bold: true });
      continue;
    }

    // Italic *text*
    if (text[i] === '*') {
      flushBuffer();
      i++;
      let italicText = '';
      while (i < text.length && text[i] !== '*') {
        italicText += text[i++];
      }
      i++;
      runs.push({ text: italicText, italic: true });
      continue;
    }

    // Inline code `text`
    if (text[i] === '`') {
      flushBuffer();
      i++;
      let codeText = '';
      while (i < text.length && text[i] !== '`') {
        codeText += text[i++];
      }
      i++;
      runs.push({ text: codeText, code: true });
      continue;
    }

    // Link [text](url) or internal anchor [text](#anchor)
    if (text[i] === '[') {
      flushBuffer();
      i++;
      let linkText = '';
      while (i < text.length && text[i] !== ']') {
        linkText += text[i++];
      }
      i++; // skip ]
      if (text[i] === '(') {
        i++;
        let url = '';
        while (i < text.length && text[i] !== ')') {
          url += text[i++];
        }
        i++;
        if (url.startsWith('#')) {
          runs.push({ text: linkText, link: url, anchor: url.substring(1) });
        } else {
          runs.push({ text: linkText, link: url });
        }
        continue;
      } else {
        buffer += '[' + linkText + ']';
        continue;
      }
    }

    buffer += text[i++];
  }

  flushBuffer();
  return runs;
}

// Parse table lines into rows of inline-formatted cells
function parseTable(lines) {
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === 1) continue; // skip separator row
    const parts = lines[i].split('|');
    if (parts[0].trim() === '') parts.shift();
    if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
    const cells = parts.map(c => parseInline(c.trim()));
    rows.push(cells);
  }
  return rows;
}

// Main block parser -- returns { tokens, counts }
function parseMarkdown(text) {
  const normalized = (text || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const tokens = [];
  let i = 0;
  const stats = { headings: 0, tables: 0, blockQuotes: 0, codeBlocks: 0 };

  // Block parser registry (same architecture as pwa/app.js)
  const blockParsers = [
    // Horizontal rule (---, ***, ___)
    {
      name: 'hr',
      detect: (line, trimmed) => /^([-*_]){3,}$/.test(trimmed),
      parse: (lines, i) => ({ token: { type: 'hr' }, newIndex: i + 1 })
    },
    // Heading
    {
      name: 'heading',
      detect: (line) => /^(#{1,6})\s+(.+)$/.test(line),
      parse: (lines, i, stats) => {
        const m = /^(#{1,6})\s+(.+)$/.exec(lines[i]);
        stats.headings++;
        return { token: { type: 'heading', level: m[1].length, content: parseInline(m[2]) }, newIndex: i + 1 };
      }
    },
    // Code block / Mermaid
    {
      name: 'codeblock',
      detect: (line, trimmed) => /^```/.test(trimmed),
      parse: (lines, i, stats) => {
        const lang = lines[i].trim().slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        if (lang.toLowerCase() === 'mermaid') {
          return { token: { type: 'mermaid', content: codeLines.join('\n') }, newIndex: i };
        }
        stats.codeBlocks++;
        return { token: { type: 'code', lang, content: codeLines.join('\n') }, newIndex: i };
      }
    },
    // Block quote
    {
      name: 'blockquote',
      detect: (line) => /^\s*>\s?/.test(line),
      parse: (lines, i, stats) => {
        const quoteLines = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        const segments = [];
        let current = [];
        for (const ql of quoteLines) {
          if (ql.trim() === '') {
            if (current.length) { segments.push(current.join(' ')); current = []; }
          } else {
            current.push(ql);
          }
        }
        if (current.length) segments.push(current.join(' '));
        const quoteTokens = segments.map(t => ({ type: 'paragraph', content: parseInline(t) }));
        stats.blockQuotes++;
        return { token: { type: 'blockquote', content: quoteTokens }, newIndex: i };
      }
    },
    // Table
    {
      name: 'table',
      detect: (line, trimmed, lines, i) => /\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1]),
      parse: (lines, i, stats) => {
        const tableLines = [lines[i]];
        i++;
        tableLines.push(lines[i]);
        i++;
        while (i < lines.length && /\|/.test(lines[i])) { tableLines.push(lines[i]); i++; }
        stats.tables++;
        return { token: { type: 'table', rows: parseTable(tableLines) }, newIndex: i };
      }
    },
    // List (ordered and unordered, nested)
    {
      name: 'list',
      detect: (line) => /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line),
      parse: (lines, i) => {
        const ordered = /^\s*\d+\.\s/.test(lines[i]);
        const items = [];
        while (i < lines.length) {
          const line = lines[i];
          if (line.trim() === '') {
            i++;
            if (i < lines.length) {
              const nl = lines[i];
              const nOrd = /^\s*\d+\.\s/.test(nl);
              const nUnord = /^\s*[-*+]\s/.test(nl);
              const nCont = /^\s{4,}/.test(nl);
              if (nCont || (ordered && nOrd) || (!ordered && nUnord)) continue;
              else break;
            } else break;
          }
          const isOrdered = /^\s*\d+\.\s/.test(line);
          const isUnordered = /^\s*[-*+]\s/.test(line);
          const isContinuation = /^\s{4,}/.test(line) && !isOrdered && !isUnordered;
          if (isContinuation) {
            if (items.length > 0) {
              const last = items[items.length - 1];
              last.runs.push({ text: ' ' });
              last.runs.push(...parseInline(line.trim()));
            }
            i++; continue;
          }
          if ((ordered && isUnordered && !/^\s{2,}/.test(line)) ||
              (!ordered && isOrdered && !/^\s{2,}/.test(line))) break;
          if (!isOrdered && !isUnordered) break;
          const indentMatch = /^(\s*)/.exec(line);
          const indent = indentMatch ? indentMatch[1].length : 0;
          let level = Math.min(Math.floor(indent / 4), 2);
          const itemOrdered = /^\s*\d+\.\s/.test(line);
          const textPart = line.replace(/^\s*(?:[-*+]|\d+\.)\s/, '');
          items.push({ level, runs: parseInline(textPart), ordered: itemOrdered });
          i++;
        }
        return { token: { type: 'list', ordered, items }, newIndex: i };
      }
    }
  ];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    let matched = false;

    for (const parser of blockParsers) {
      if (parser.detect(line, trimmed, lines, i)) {
        const result = parser.parse(lines, i, stats);
        tokens.push(result.token);
        i = result.newIndex;
        matched = true;
        break;
      }
    }

    if (matched) continue;
    if (!trimmed) { i++; continue; }

    // Paragraph (fallback)
    const paraLines = [line];
    i++;
    while (i < lines.length && lines[i].trim() &&
           !/^(#{1,6}\s|```|>\s|\||\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }

    // Metadata lines (**Label:** pattern) -> each line its own paragraph
    const isMetadata = paraLines.length > 1 &&
      paraLines.filter(l => /^\*\*[^*]+:\*\*/.test(l.trim())).length >= 2;

    if (isMetadata) {
      for (const pLine of paraLines) {
        tokens.push({ type: 'paragraph', content: parseInline(pLine) });
      }
    } else {
      tokens.push({ type: 'paragraph', content: parseInline(paraLines.join(' ')) });
    }
  }

  return { tokens, counts: stats };
}

module.exports = { parseMarkdown };
