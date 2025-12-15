
/* PWA Markdown → DOCX skeleton (no external installs) */
(function () {
  const mdInput = document.getElementById('markdownInput');
  const convertBtn = document.getElementById('convertBtn');
  const fileInput = document.getElementById('fileInput');
  const mermaidToggle = document.getElementById('mermaidToggle');
  const downloadSection = document.getElementById('downloadSection');
  const downloadLink = document.getElementById('downloadLink');
  const previewAccordion = document.getElementById('previewAccordion');
  const previewContent = document.getElementById('previewContent');
  const resultsAccordion = document.getElementById('resultsAccordion');
  const resultSummary = document.getElementById('resultSummary');
  const modeInputs = document.querySelectorAll('input[name="outputMode"]');
  const pngOptions = document.getElementById('pngOptions');
  const pngWidthInput = document.getElementById('pngWidthInput');

  const DRAFT_KEY = 'draft_markdown_v1';
  const HISTORY_KEY = 'conversion_history_v1';
  const MODE_KEY = 'output_mode_v1';
  const PNG_WIDTH_KEY = 'png_width_v1';
  const DEFAULT_PNG_WIDTH = 3000;
  const MAX_PNG_DIMENSION = 10000;

  // Service worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js');
    });
  }

  // Restore draft
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) mdInput.value = saved;
  } catch {}

  // Save draft on input
  mdInput.addEventListener('input', () => {
    try { localStorage.setItem(DRAFT_KEY, mdInput.value || ''); } catch {}
    updatePreview();
  });

  // Update preview when Mermaid toggle changes
  mermaidToggle.addEventListener('change', () => {
    updatePreview();
  });

  let currentMode = 'docx';
  initModeControls();
  initPngWidthControl();

  // Preview rendering function
  async function updatePreview() {
    const text = mdInput.value.trim();
    if (!text) {
      previewAccordion.classList.add('hidden');
      return;
    }

    const { tokens } = parseMarkdown(text);
    const mermaidEnabled = mermaidToggle && mermaidToggle.checked;
    
    let html = '';
    for (const token of tokens) {
      if (token.type === 'mermaid' && mermaidEnabled) {
        const id = 'preview-mermaid-' + Math.random().toString(36).substr(2, 9);
        html += `<div class="mermaid" id="${id}">${token.content}</div>`;
      } else if (token.type === 'code') {
        html += `<pre><code>${escapeHtml(token.content)}</code></pre>`;
      } else if (token.type === 'heading') {
        const level = token.level;
        const text = token.content.map(r => r.text || '').join('');
        html += `<h${level}>${escapeHtml(text)}</h${level}>`;
      }
    }

    previewContent.innerHTML = html;
    previewAccordion.classList.remove('hidden');

    // Render Mermaid diagrams
    if (mermaidEnabled && typeof mermaid !== 'undefined') {
      try {
        // Wait a tick for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 10));
        const mermaidElements = previewContent.querySelectorAll('.mermaid');
        if (mermaidElements.length > 0) {
          await mermaid.run({ nodes: mermaidElements });
        }
      } catch (e) {
        console.error('Mermaid preview render failed', e);
        // Show error in preview
        previewContent.querySelectorAll('.mermaid').forEach(el => {
          el.innerHTML = `<div style="color: #d32f2f; padding: 1rem; background: #ffebee; border-left: 4px solid #d32f2f;">
            <strong>Mermaid diagram failed to render</strong><br>
            <small>${e.message || 'Unknown error'}</small>
          </div>`;
        });
      }
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Handle file selection (concatenate alphabetically)
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.sort((a, b) => a.name.localeCompare(b.name));
    const parts = [];
    for (const f of files) {
      const text = await f.text();
      parts.push(text.trim());
    }
    mdInput.value = parts.join('\n\n');
    mdInput.dispatchEvent(new Event('input'));
  });

  function initModeControls() {
    let saved = 'docx';
    try {
      const stored = localStorage.getItem(MODE_KEY);
      if (stored === 'png' || stored === 'docx') saved = stored;
    } catch {}
    setMode(saved, false);
    modeInputs.forEach(input => {
      if (input.value === saved) input.checked = true;
      input.addEventListener('change', () => {
        if (input.checked) setMode(input.value);
      });
    });
  }

  function initPngWidthControl() {
    if (!pngWidthInput) return;
    let savedWidth = DEFAULT_PNG_WIDTH;
    try {
      const stored = parseInt(localStorage.getItem(PNG_WIDTH_KEY), 10);
      if (!isNaN(stored)) savedWidth = normalizePngWidth(stored);
    } catch {}
    pngWidthInput.value = savedWidth;
    pngWidthInput.addEventListener('change', () => {
      const normalized = normalizePngWidth(pngWidthInput.value);
      pngWidthInput.value = normalized;
      try { localStorage.setItem(PNG_WIDTH_KEY, normalized); } catch {}
    });
  }

  function setMode(mode, persist = true) {
    currentMode = mode === 'png' ? 'png' : 'docx';
    modeInputs.forEach(input => {
      input.checked = input.value === currentMode;
    });
    if (persist) {
      try { localStorage.setItem(MODE_KEY, currentMode); } catch {}
    }
    if (pngOptions) {
      pngOptions.classList.toggle('hidden', currentMode !== 'png');
    }
    if (convertBtn) {
      if (currentMode === 'png') {
        convertBtn.textContent = 'Export Mermaid PNG';
        convertBtn.setAttribute('aria-label', 'Export mermaid diagram as PNG');
      } else {
        convertBtn.textContent = 'Convert to DOCX';
        convertBtn.setAttribute('aria-label', 'Convert markdown to DOCX');
      }
    }
    if (downloadSection) downloadSection.classList.add('hidden');
    if (resultsAccordion) resultsAccordion.classList.add('hidden');
  }

  function normalizePngWidth(value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) return DEFAULT_PNG_WIDTH;
    return Math.min(MAX_PNG_DIMENSION, Math.max(1, parsed));
  }

  function getTargetPngWidth() {
    if (!pngWidthInput) return DEFAULT_PNG_WIDTH;
    const normalized = normalizePngWidth(pngWidthInput.value || DEFAULT_PNG_WIDTH);
    try { localStorage.setItem(PNG_WIDTH_KEY, normalized); } catch {}
    return normalized;
  }

  // Markdown parser: produces IR with tokens
  function parseMarkdown(text) {
    const normalized = (text || '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const tokens = [];
    let i = 0;
    let headings = 0, tables = 0, blockQuotes = 0, codeBlocks = 0;

    // Block parser registry - extensible architecture
    const blockParsers = [
      // Horizontal rule parser (---, ***, ___)
      {
        name: 'hr',
        detect: (line, trimmed) => /^([-*_]){3,}$/.test(trimmed),
        parse: (lines, i, stats) => {
          return { token: { type: 'hr' }, newIndex: i + 1 };
        }
      },
      // Heading parser
      {
        name: 'heading',
        detect: (line, trimmed) => /^(#{1,6})\s+(.+)$/.test(line),
        parse: (lines, i, stats) => {
          const line = lines[i];
          const hMatch = /^(#{1,6})\s+(.+)$/.exec(line);
          const level = hMatch[1].length;
          const content = hMatch[2];
          stats.headings++;
          return { token: { type: 'heading', level, content: parseInline(content) }, newIndex: i + 1 };
        }
      },
      // Code/Mermaid block parser
      {
        name: 'codeblock',
        detect: (line, trimmed) => /^```/.test(trimmed),
        parse: (lines, i, stats) => {
          const trimmed = lines[i].trim();
          const lang = trimmed.slice(3).trim();
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
      // Block quote parser
      {
        name: 'blockquote',
        detect: (line, trimmed) => /^\s*>\s?/.test(line),
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
              if (current.length) {
                segments.push(current.join(' '));
                current = [];
              }
            } else {
              current.push(ql);
            }
          }
          if (current.length) segments.push(current.join(' '));
          const quoteTokens = segments.map(text => ({ type: 'paragraph', content: parseInline(text) }));
          stats.blockQuotes++;
          return { token: { type: 'blockquote', content: quoteTokens }, newIndex: i };
        }
      },
      // Table parser
      {
        name: 'table',
        detect: (line, trimmed, lines, i) => /\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1]),
        parse: (lines, i, stats) => {
          const tableLines = [lines[i]];
          i++;
          tableLines.push(lines[i]);
          i++;
          while (i < lines.length && /\|/.test(lines[i])) {
            tableLines.push(lines[i]);
            i++;
          }
          stats.tables++;
          return { token: { type: 'table', rows: parseTable(tableLines) }, newIndex: i };
        }
      },
      // List parser
      {
        name: 'list',
        detect: (line, trimmed) => /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line),
        parse: (lines, i, stats) => {
          const ordered = /^\s*\d+\.\s/.test(lines[i]);
          const items = [];
          const startIndex = i;
          
          // Collect items that match the same list type (ordered/unordered) at base level
          // Allow blank lines and continuation paragraphs within lists
          while (i < lines.length) {
            const line = lines[i];
            
            // Skip blank lines within lists
            if (line.trim() === '') {
              i++;
              // Check if next line continues the SAME TYPE of list
              if (i < lines.length) {
                const nextLine = lines[i];
                const nextIsOrdered = /^\s*\d+\.\s/.test(nextLine);
                const nextIsUnordered = /^\s*[-*+]\s/.test(nextLine);
                const nextIsContinuation = /^\s{4,}/.test(nextLine);
                
                // Only continue if next line matches the current list type or is a continuation
                if (nextIsContinuation || (ordered && nextIsOrdered) || (!ordered && nextIsUnordered)) {
                  continue;
                } else {
                  // Blank line followed by different list type or non-list content - end the list
                  break;
                }
              } else {
                break;
              }
            }
            
            const isOrdered = /^\s*\d+\.\s/.test(line);
            const isUnordered = /^\s*[-*+]\s/.test(line);
            
            // Check if this is a continuation line (indented but not a list marker)
            const isContinuation = /^\s{4,}/.test(line) && !isOrdered && !isUnordered;
            
            if (isContinuation) {
              // Append continuation text to the last item
              if (items.length > 0) {
                const lastItem = items[items.length - 1];
                const continuationText = line.trim();
                // Parse the continuation text for formatting and merge the runs
                const continuationRuns = parseInline(continuationText);
                // Add space before continuation
                lastItem.runs.push({ text: ' ' });
                lastItem.runs.push(...continuationRuns);
              }
              i++;
              continue;
            }
            
            // Stop if we hit a different list type at base level (indent 0)
            if ((ordered && isUnordered && !/^\s{2,}/.test(line)) || 
                (!ordered && isOrdered && !/^\s{2,}/.test(line))) {
              break;
            }
            
            // Stop if not a list item at all
            if (!isOrdered && !isUnordered) {
              break;
            }
            
            const raw = line;
            const indentMatch = /^(\s*)/.exec(raw);
            const indent = indentMatch ? indentMatch[1].length : 0;
            
            // Calculate nesting level based on indentation (4 spaces = 1 level)
            let level = Math.floor(indent / 4);
            // Cap at level 2 for Word compatibility
            if (level > 2) level = 2;
            
            // Track if THIS item is ordered or unordered (for mixed nesting)
            const itemOrdered = /^\s*\d+\.\s/.test(line);
            
            const textPart = raw.replace(/^\s*(?:[-*+]|\d+\.)\s/, '');
            items.push({ level, runs: parseInline(textPart), ordered: itemOrdered });
            i++;
          }
          return { token: { type: 'list', ordered, items }, newIndex: i };
        }
      }
    ];

    const stats = { headings: 0, tables: 0, blockQuotes: 0, codeBlocks: 0 };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Try each block parser
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

      // Empty line
      if (!trimmed) {
        i++;
        continue;
      }

      // Paragraph (fallback)
      const paraLines = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>\s|\||\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i])) {
        paraLines.push(lines[i]);
        i++;
      }
      
      // Check if this looks like metadata fields (multiple lines with **Label:** pattern)
      // If so, create separate paragraphs for each line to preserve formatting
      const isMetadata = paraLines.length > 1 && 
        paraLines.filter(l => /^\*\*[^*]+:\*\*/.test(l.trim())).length >= 2;
      
      if (isMetadata) {
        // Each line becomes its own paragraph
        for (const pLine of paraLines) {
          tokens.push({ type: 'paragraph', content: parseInline(pLine) });
        }
      } else {
        // Normal paragraph - join lines with space
        tokens.push({ type: 'paragraph', content: parseInline(paraLines.join(' ')) });
      }
    }

    headings = stats.headings;
    tables = stats.tables;
    blockQuotes = stats.blockQuotes;
    codeBlocks = stats.codeBlocks;

    return { tokens, counts: { headings, tables, blockQuotes, codeBlocks } };
  }

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

      // Link [text](url) or internal link [text](#anchor)
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
          // Check if it's an internal anchor link (#...)
          if (url.startsWith('#')) {
            runs.push({ text: linkText, link: url, anchor: url.substring(1) });
          } else {
            runs.push({ text: linkText, link: url });
          }
          continue;
        } else {
          // not a link, treat as plain text
          buffer += '[' + linkText + ']';
          continue;
        }
      }

      buffer += text[i++];
    }

    flushBuffer();
    return runs;
  }

  // Syntax highlighting for code blocks
  function highlightCode(code, lang) {
    const { escapeXml } = window.DOCXTemplates;
    lang = (lang || '').toLowerCase();
    
    // Professional IDE-style colors
    const colors = {
      keyword: '0000FF',      // Blue - keywords
      string: '008000',       // Green - strings
      comment: '008000',      // Green - comments (matching strings)
      number: '098658',       // Teal - numbers
      function: '795E26',     // Brown - function names
      type: '267F99',         // Dark cyan - types/classes
      operator: '000000'      // Black - operators
    };
    
    // SQL keywords (comprehensive list)
    const sqlKeywords = /\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|OUTER|FULL|CROSS|ON|AND|OR|NOT|IN|EXISTS|LIKE|BETWEEN|IS|NULL|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|DATABASE|SCHEMA|PRIMARY|FOREIGN|KEY|CONSTRAINT|REFERENCES|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MIN|MAX|CAST|CONVERT|WITH|RECURSIVE|PARTITION BY|OVER|ROW_NUMBER|RANK|DENSE_RANK|BEGIN|COMMIT|ROLLBACK|TRANSACTION|DECLARE|VARCHAR|INT|INTEGER|BIGINT|DECIMAL|NUMERIC|DATE|DATETIME|TIMESTAMP|TEXT|BLOB|BOOLEAN|IF|ELSIF|WHILE|LOOP|PROCEDURE|FUNCTION|RETURNS|TRIGGER|COLUMN|ADD|MODIFY|GRANT|REVOKE|TRUNCATE|COMMENT|STRING|DEFAULT)\b/gi;
    
    // Python keywords (comprehensive list)
    const pythonKeywords = /\b(def|class|if|elif|else|for|while|break|continue|return|yield|import|from|as|try|except|finally|raise|with|lambda|pass|assert|global|nonlocal|del|True|False|None|and|or|not|in|is|async|await|match|case)\b/g;
    
    // Function/method calls - name followed by (
    const functionPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g;
    
    // Numbers (integers, floats, hex)
    const numberPattern = /\b(\d+\.?\d*|\.\d+|0x[0-9a-fA-F]+)\b/g;
    
    // Strings - single or double quotes
    const stringPattern = /(["'])((?:\\.|(?!\1).)*?)\1/g;
    
    // Comments - SQL (--) or Python (#)
    const sqlCommentPattern = /--.*$/gm;
    const pythonCommentPattern = /#.*$/gm;
    
    if (lang === 'sql') {
      return highlightWithPatterns(code, [
        { pattern: sqlCommentPattern, color: colors.comment, tag: 'comment' },
        { pattern: stringPattern, color: colors.string, tag: 'string' },
        { pattern: sqlKeywords, color: colors.keyword, tag: 'keyword' },
        { pattern: functionPattern, color: colors.function, tag: 'function' },
        { pattern: numberPattern, color: colors.number, tag: 'number' }
      ]);
    } else if (lang === 'python' || lang === 'py') {
      return highlightWithPatterns(code, [
        { pattern: pythonCommentPattern, color: colors.comment, tag: 'comment' },
        { pattern: stringPattern, color: colors.string, tag: 'string' },
        { pattern: pythonKeywords, color: colors.keyword, tag: 'keyword' },
        { pattern: functionPattern, color: colors.function, tag: 'function' },
        { pattern: numberPattern, color: colors.number, tag: 'number' }
      ]);
    }
    
    // No highlighting for other languages
    return [{ text: code }];
  }
  
  function highlightWithPatterns(code, patterns) {
    const { escapeXml } = window.DOCXTemplates;
    const tokens = [];
    let lastIndex = 0;
    const matches = [];
    
    // Collect all matches with their positions
    patterns.forEach((p, pIdx) => {
      const regex = new RegExp(p.pattern.source, p.pattern.flags);
      let match;
      while ((match = regex.exec(code)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          color: p.color,
          priority: pIdx // Earlier patterns have higher priority
        });
      }
    });
    
    // Sort by position, then by priority (for overlaps)
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.end !== b.end) return b.end - a.end; // Longer match first
      return a.priority - b.priority;
    });
    
    // Remove overlapping matches (keep higher priority)
    const filtered = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        filtered.push(m);
        lastEnd = m.end;
      }
    }
    
    // Build tokens with plain text and highlighted segments
    filtered.forEach(m => {
      if (m.start > lastIndex) {
        tokens.push({ text: code.substring(lastIndex, m.start) });
      }
      tokens.push({ text: m.text, color: m.color });
      lastIndex = m.end;
    });
    
    if (lastIndex < code.length) {
      tokens.push({ text: code.substring(lastIndex) });
    }
    
    return tokens.length > 0 ? tokens : [{ text: code }];
  }

  // Generate bookmark name from heading text (slug-style)
  function generateBookmark(text) {
    // Extract plain text from runs if needed
    const plainText = typeof text === 'string' ? text : 
      text.map(r => r.text).join('');
    return plainText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40); // Word bookmark limit
  }

  // Parse table into rows of cells
  function parseTable(lines) {
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === 1) continue; // skip separator row
      // Split by | and remove leading/trailing empty strings
      const parts = lines[i].split('|');
      // Remove first and last if empty (typical for |cell|cell| format)
      if (parts[0].trim() === '') parts.shift();
      if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
      // Now parse inline content for each cell (keeping empty cells)
      const cells = parts.map(c => parseInline(c.trim()));
      rows.push(cells);
    }
    return rows;
  }

  // Build word/document.xml from parsed tokens
  function buildDocumentXml(tokens, imageMap) {
    const { escapeXml } = window.DOCXTemplates;
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    xml += '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">';
    xml += '<w:body>';

    let listCounter = 0; // Counter for generating unique numIds

    for (const token of tokens) {
      if (token.type === 'hr') {
        // Horizontal rule as border paragraph
        xml += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr></w:pPr><w:r><w:t></w:t></w:r></w:p>';
      } else if (token.type === 'heading') {
        const bookmark = generateBookmark(token.content);
        const bookmarkId = Math.floor(Math.random() * 1000000);
        xml += `<w:p><w:pPr><w:pStyle w:val="Heading${token.level}"/></w:pPr>`;
        xml += `<w:bookmarkStart w:id="${bookmarkId}" w:name="${escapeXml(bookmark)}"/>`;
        xml += buildRuns(token.content);
        xml += `<w:bookmarkEnd w:id="${bookmarkId}"/>`;
        xml += '</w:p>';
      } else if (token.type === 'paragraph') {
        xml += '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>';
        xml += buildRuns(token.content);
        xml += '</w:p>';
      } else if (token.type === 'blockquote') {
        for (const subToken of token.content) {
          xml += '<w:p><w:pPr><w:pStyle w:val="BlockQuote"/></w:pPr>';
          if (subToken.type === 'paragraph') {
            xml += buildRuns(subToken.content);
          } else {
            xml += `<w:r><w:t>${escapeXml(JSON.stringify(subToken))}</w:t></w:r>`;
          }
          xml += '</w:p>';
        }
      } else if (token.type === 'code') {
        const lines = token.content.split('\n');
        for (const line of lines) {
          xml += '<w:p><w:pPr><w:pStyle w:val="CodeBlock"/></w:pPr>';
          // Apply syntax highlighting if language is specified
          const highlighted = highlightCode(line, token.lang);
          for (const segment of highlighted) {
            xml += '<w:r>';
            xml += '<w:rPr>';
            xml += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
            xml += '<w:sz w:val="20"/>';
            if (segment.color) {
              xml += `<w:color w:val="${segment.color}"/>`;
            }
            xml += '</w:rPr>';
            xml += `<w:t xml:space="preserve">${escapeXml(segment.text)}</w:t>`;
            xml += '</w:r>';
          }
          xml += '</w:p>';
        }
      } else if (token.type === 'list') {
        // Each list needs a unique numId that references the correct abstract numbering
        // Generate separate numIds for ordered vs unordered items
        // Note: abstractId = numId - 1, so:
        //   - Even abstractId (0,2,4...) = bullets
        //   - Odd abstractId (1,3,5...) = numbers
        // Therefore: odd numId (1,3,5...) → even abstractId → bullets
        //           even numId (2,4,6...) → odd abstractId → numbers
        const baseNumIdUnordered = (listCounter * 2) + 1; // Odd numId → even abstractId → bullets
        const baseNumIdOrdered = (listCounter * 2) + 2;   // Even numId → odd abstractId → numbers
        listCounter++;
        
        for (const item of token.items) {
          xml += '<w:p><w:pPr><w:pStyle w:val="Normal"/>';
          const ilvl = item.level || 0;
          // Use different numId based on whether this specific item is ordered or unordered
          const numId = item.ordered ? baseNumIdOrdered : baseNumIdUnordered;
          xml += `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`;
          xml += '</w:pPr>';
          xml += buildRuns(item.runs);
          xml += '</w:p>';
        }
      } else if (token.type === 'table') {
        xml += '<w:tbl>';
        xml += '<w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/>';
        xml += '<w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>';
        xml += '</w:tblPr>';
        // Build grid structure for consistent column widths
        if (token.rows.length > 0) {
          const colCount = token.rows[0].length;
          xml += '<w:tblGrid>';
          // Calculate dynamic column widths based on count (total width ~9000 dxa = 6.25 inches)
          const colWidth = Math.floor(9000 / colCount);
          for (let c = 0; c < colCount; c++) {
            xml += `<w:gridCol w:w="${colWidth}"/>`;
          }
          xml += '</w:tblGrid>';
        }
        for (let i = 0; i < token.rows.length; i++) {
          const isHeader = i === 0;
          const row = token.rows[i];
          xml += '<w:tr>';
          // Ensure all rows have the same number of cells as header
          const expectedCols = token.rows[0].length;
          for (let c = 0; c < expectedCols; c++) {
            const cell = c < row.length ? row[c] : [];
            xml += '<w:tc>';
            xml += '<w:tcPr>';
            if (isHeader) {
              // Header row: #E0E0E0
              xml += '<w:shd w:val="clear" w:color="auto" w:fill="E0E0E0"/>';
            } else {
              // Stripe body rows starting with white for the first data row
              const bodyIndex = i - 1; // 0-based index for data rows
              if (bodyIndex % 2 === 0) {
                // First, third, ... data rows: white
                xml += '<w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>';
              } else {
                // Second, fourth, ... data rows: light gray
                xml += '<w:shd w:val="clear" w:color="auto" w:fill="F3F3F3"/>';
              }
            }
            xml += '</w:tcPr>';
            xml += '<w:p>';
            if (isHeader) {
              xml += '<w:pPr><w:jc w:val="left"/></w:pPr>';
            }
            // Build runs directly with header bold applied to each run
            if (cell.length > 0) {
              for (const run of cell) {
                // Handle internal anchor links in tables
                if (run.anchor) {
                  xml += `<w:hyperlink w:anchor="${escapeXml(run.anchor)}">`;
                  xml += '<w:r>';
                  xml += '<w:rPr><w:rStyle w:val="Hyperlink"/>';
                  if (isHeader) xml += '<w:b/>';
                  xml += '</w:rPr>';
                  xml += `<w:t>${escapeXml(run.text)}</w:t>`;
                  xml += '</w:r>';
                  xml += '</w:hyperlink>';
                  continue;
                }
                
                xml += '<w:r>';
                if (isHeader || run.bold || run.italic || run.code || run.link) {
                  xml += '<w:rPr>';
                  if (isHeader) xml += '<w:b/>';
                  if (run.bold) xml += '<w:b/>';
                  if (run.italic) xml += '<w:i/>';
                  if (run.code) {
                    xml += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
                    xml += '<w:sz w:val="20"/>';
                    xml += '<w:shd w:val="clear" w:fill="F4F4F4"/>';
                  }
                  if (run.link) {
                    xml += '<w:color w:val="000000"/><w:u w:val="single"/>';
                  }
                  xml += '</w:rPr>';
                }
                xml += `<w:t xml:space="preserve">${escapeXml(run.text)}</w:t>`;
                xml += '</w:r>';
              }
            } else {
              // Empty cell - add empty run to maintain structure
              xml += '<w:r><w:t></w:t></w:r>';
            }
            xml += '</w:p>';
            xml += '</w:tc>';
          }
          xml += '</w:tr>';
        }
        xml += '</w:tbl>';
      } else if (token.type === 'mermaid') {
        // Insert image paragraph (imageMap provides width/height/rId)
        const info = imageMap[token.content];
        if (info) {
          const { rId, widthEmu, heightEmu, name } = info;
          xml += '<w:p><w:r><w:drawing>';
          xml += `<wp:inline distT="0" distB="0" distL="0" distR="0">`;
          xml += `<wp:extent cx="${widthEmu}" cy="${heightEmu}"/>`;
          xml += `<wp:docPr id="${info.id}" name="${escapeXml(name)}"/>`;
          xml += '<wp:cNvGraphicFramePr/>';
          xml += '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">';
          xml += '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Thumbnail"/><pic:cNvPicPr/></pic:nvPicPr>';
          xml += '<pic:blipFill>';
          xml += `<a:blip r:embed="${rId}"/>`;
          xml += '<a:stretch><a:fillRect/></a:stretch>';
          xml += '</pic:blipFill>';
          xml += '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+widthEmu+'" cy="'+heightEmu+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>';
          xml += '</pic:pic>';
          xml += '</a:graphicData></a:graphic>';
          xml += '</wp:inline>';
          xml += '</w:drawing></w:r></w:p>';
        }
      }
    }

    xml += '</w:body></w:document>';
    return xml;
  }

  // Build runs for inline formatting
  function buildRuns(runs) {
    const { escapeXml } = window.DOCXTemplates;
    let xml = '';
    for (const run of runs) {
      // Internal anchor link - use w:hyperlink with w:anchor
      if (run.anchor) {
        xml += `<w:hyperlink w:anchor="${escapeXml(run.anchor)}">`;
        xml += '<w:r>';
        xml += '<w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>';
        xml += `<w:t>${escapeXml(run.text)}</w:t>`;
        xml += '</w:r>';
        xml += '</w:hyperlink>';
        continue;
      }
      
      xml += '<w:r>';
      if (run.bold || run.italic || run.code || run.link) {
        xml += '<w:rPr>';
        if (run.bold) xml += '<w:b/>';
        if (run.italic) xml += '<w:i/>';
        if (run.code) {
          xml += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
          xml += '<w:sz w:val="20"/>';
          xml += '<w:shd w:val="clear" w:fill="F4F4F4"/>';
        }
        if (run.link) {
          xml += '<w:color w:val="0563C1"/>';
        }
        xml += '</w:rPr>';
      }
      xml += `<w:t xml:space="preserve">${escapeXml(run.text)}</w:t>`;
      xml += '</w:r>';
    }
    return xml;
  }

  // Build DOCX using JSZip
  async function buildDocxBlob(tokens) {
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
    const name = `converted_${stamp}.docx`;

    const zip = new JSZip();

    // Render mermaid diagrams (if any)
    const mermaidTokens = tokens.filter(t => t.type === 'mermaid');
    const imageMap = {}; // key: diagram code, value: { rId, widthEmu, heightEmu, id, name }
    let imageIndex = 1;
    for (const t of mermaidTokens) {
      try {
        const cleanedSource = sanitizeMermaidSource(t.content);
        const svg = await mermaid.render('mermaid-'+imageIndex, cleanedSource);
        
        // Parse SVG to get dimensions
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg.svg, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // Try to get dimensions from width/height attributes
        let svgWidth = parseFloat(svgElement.getAttribute('width'));
        let svgHeight = parseFloat(svgElement.getAttribute('height'));
        
        // If width/height are missing or invalid, try viewBox
        if (!svgWidth || !svgHeight || isNaN(svgWidth) || isNaN(svgHeight)) {
          const viewBox = svgElement.getAttribute('viewBox');
          if (viewBox) {
            const parts = viewBox.split(/\s+/);
            if (parts.length === 4) {
              svgWidth = parseFloat(parts[2]);
              svgHeight = parseFloat(parts[3]);
            }
          }
        }
        
        // Final fallback
        if (!svgWidth || isNaN(svgWidth)) svgWidth = 800;
        if (!svgHeight || isNaN(svgHeight)) svgHeight = 400;
        
        // Scale up for high-resolution export (3x for crisp rendering)
        const scale = 3;
        const canvasWidth = svgWidth * scale;
        const canvasHeight = svgHeight * scale;
        
        // Remove any external references that cause CORS issues
        svgElement.querySelectorAll('*').forEach(el => {
          if (el.hasAttribute('href') && el.getAttribute('href').startsWith('http')) {
            el.removeAttribute('href');
          }
          if (el.hasAttribute('xlink:href') && el.getAttribute('xlink:href').startsWith('http')) {
            el.removeAttribute('xlink:href');
          }
        });
        
        // Serialize cleaned SVG
        const serializer = new XMLSerializer();
        const cleanedSvg = serializer.serializeToString(svgElement);
        
        // Convert to data URI
        const svgDataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(cleanedSvg)));
        
        // Create high-resolution canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        
        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = svgDataUri;
        });
        
        // Draw scaled image for high resolution
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const arrayBuffer = await pngBlob.arrayBuffer();
        const fileName = `image${imageIndex}.png`;
        zip.file(`word/media/${fileName}`, arrayBuffer);
        
        // Word page width in inches: 6.5" (8.5" - 1" margins on each side)
        // Convert to EMUs: 6.5 * 914400 = 5943600 EMUs
        const maxWidthEmu = 5943600;
        
        // Calculate aspect ratio correctly
        const actualWidth = svgWidth;  // Original SVG width
        const actualHeight = svgHeight; // Original SVG height
        const aspectRatio = actualHeight / actualWidth;
        
        // Calculate dimensions to fit page width
        let widthEmu = maxWidthEmu;
        let heightEmu = Math.round(maxWidthEmu * aspectRatio);
        
        // If height exceeds reasonable bounds (page height ~9"), scale down
        const maxHeightEmu = 8229600; // 9 inches
        if (heightEmu > maxHeightEmu) {
          heightEmu = maxHeightEmu;
          widthEmu = Math.round(maxHeightEmu / aspectRatio);
        }
        
        const rId = 'rIdImg' + imageIndex;
        imageMap[t.content] = { rId, widthEmu, heightEmu, id: 500+imageIndex, name: fileName };
        imageIndex++;
      } catch (e) {
        console.warn('Mermaid render failed', e);
        // Fallback: insert a placeholder image and warning
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFF0F0';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#900';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('Mermaid diagram failed to render', 40, 100);
        ctx.font = '16px sans-serif';
        ctx.fillText('Check Mermaid.js availability', 40, 150);
        const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const arrayBuffer = await pngBlob.arrayBuffer();
        const fileName = `image${imageIndex}.png`;
        zip.file(`word/media/${fileName}`, arrayBuffer);
        const widthEmu = canvas.width * 9525;
        const heightEmu = canvas.height * 9525;
        const rId = 'rIdImg' + imageIndex;
        imageMap[t.content] = { rId, widthEmu, heightEmu, id: 500+imageIndex, name: fileName };
        imageIndex++;
      }
    }

    // Add all required files
    zip.file('[Content_Types].xml', window.DOCXTemplates.getContentTypes());
    zip.file('_rels/.rels', window.DOCXTemplates.getRootRels());
    zip.file('word/document.xml', buildDocumentXml(tokens, imageMap));
    // Build dynamic document relationships including images
    let rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    rels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    rels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    rels += '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>';
    let relIdCounter = 3;
    for (const key of Object.keys(imageMap)) {
      const info = imageMap[key];
      rels += `<Relationship Id="${info.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${info.name}"/>`;
      relIdCounter++;
    }
    rels += '</Relationships>';
    zip.file('word/_rels/document.xml.rels', rels);
    zip.file('word/styles.xml', window.DOCXTemplates.getStyles());
    zip.file('word/numbering.xml', window.DOCXTemplates.getNumbering());
    zip.file('docProps/core.xml', window.DOCXTemplates.getCoreProps());

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    return { name, blob };
  }



  function extractSvgDimensions(svgElement) {
    let svgWidth = parseFloat(svgElement.getAttribute('width'));
    let svgHeight = parseFloat(svgElement.getAttribute('height'));

    if (!svgWidth || !svgHeight || isNaN(svgWidth) || isNaN(svgHeight)) {
      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/\s+/);
        if (parts.length === 4) {
          svgWidth = parseFloat(parts[2]);
          svgHeight = parseFloat(parts[3]);
        }
      }
    }

    if (!svgWidth || isNaN(svgWidth)) svgWidth = 800;
    if (!svgHeight || isNaN(svgHeight)) svgHeight = 400;

    return { svgWidth, svgHeight };
  }

  function calculatePngDimensions(dimensions, targetWidth = DEFAULT_PNG_WIDTH, maxDimension = MAX_PNG_DIMENSION) {
    const baseWidth = dimensions && !isNaN(dimensions.svgWidth) && dimensions.svgWidth > 0 ? dimensions.svgWidth : 800;
    const baseHeight = dimensions && !isNaN(dimensions.svgHeight) && dimensions.svgHeight > 0 ? dimensions.svgHeight : 400;
    const aspectRatio = baseHeight / baseWidth;

    let width = normalizePngWidth(targetWidth || DEFAULT_PNG_WIDTH);
    width = Math.min(width, maxDimension);
    let height = Math.round(width * aspectRatio);

    if (height > maxDimension) {
      height = maxDimension;
      width = Math.round(height / aspectRatio);
    }

    return { width, height, aspectRatio };
  }

  async function buildMermaidPng(tokens, targetWidthPx) {
    if (typeof mermaid === 'undefined') throw new Error('Mermaid library failed to load.');
    const mermaidTokens = tokens.filter(t => t.type === 'mermaid');
    if (!mermaidTokens.length) throw new Error('No Mermaid diagrams found in the input.');

    const cleanedSource = sanitizeMermaidSource(mermaidTokens[0].content);
    const renderId = 'mermaid-png-' + Math.random().toString(36).slice(2);
    const svg = await mermaid.render(renderId, cleanedSource);

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg.svg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    svgElement.querySelectorAll('*').forEach(el => {
      if (el.hasAttribute('href') && el.getAttribute('href').startsWith('http')) {
        el.removeAttribute('href');
      }
      if (el.hasAttribute('xlink:href') && el.getAttribute('xlink:href').startsWith('http')) {
        el.removeAttribute('xlink:href');
      }
    });

    const dimensions = extractSvgDimensions(svgElement);
    const { width, height } = calculatePngDimensions(dimensions, targetWidthPx);

    const serializer = new XMLSerializer();
    const cleanedSvg = serializer.serializeToString(svgElement);
    const svgDataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(cleanedSvg)));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = svgDataUri;
    });

    ctx.drawImage(img, 0, 0, width, height);
    const pngBlob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('PNG export failed.')), 'image/png'));
    const name = 'mermaid.png';
    return { name, blob: pngBlob, width, height };
  }

  // Sanitize mermaid source (basic) - strip script tags & on* attributes
  function sanitizeMermaidSource(src) {
    let s = src || '';
    // Remove <script>...</script>
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    // Remove on* event handler attributes (if any injected)
    s = s.replace(/on\w+\s*=\s*"[^"]*"/gi, '');
    s = s.replace(/on\w+\s*=\s*'[^']*'/gi, '');
    // Trim excessively long input (prevent huge memory usage)
    if (s.length > 20000) s = s.slice(0, 20000);
    return s;
  }

  // Global raw markdown sanitation & size clamp
  const MAX_INPUT_CHARS = 250000; // ~250 KB of text
  function sanitizeRawMarkdown(raw) {
    if (!raw) return '';
    let cleaned = raw.replace(/\u0000/g, ''); // strip null bytes
    // Reject extremely large inputs early
    if (cleaned.length > MAX_INPUT_CHARS) {
      cleaned = cleaned.slice(0, MAX_INPUT_CHARS);
    }
    return cleaned;
  }

  // Expose core functions for test harness (non-production usage)
  window.DocConverter = {
    parseMarkdown,
    buildDocxBlob,
    buildMermaidPng,
    _internals: {
      buildDocumentXml,
      sanitizeRawMarkdown,
      sanitizeMermaidSource,
      extractSvgDimensions,
      calculatePngDimensions,
      DEFAULT_PNG_WIDTH,
      MAX_PNG_DIMENSION
    }
  };

  function showPngResult({ name, blob, width, height }) {
    const size = blob.size;
    const url = URL.createObjectURL(blob);

    downloadLink.innerHTML = `
      <h2 style="margin: 0 0 12px; color: var(--fg);">✓ PNG Ready</h2>
      <a href="${url}" download="${name}">Download ${name}</a>
      <div class="download-info">
        <div>${(size / 1024).toFixed(1)} KB • ${width}×${height} px</div>
      </div>
    `;
    downloadSection.classList.remove('hidden');

    resultSummary.innerHTML = `
      <div class="summary-row">
        <strong>File:</strong>
        <code>${name}</code>
        <span>(${(size / 1024).toFixed(1)} KB)</span>
      </div>
      <div class="summary-row">
        <span>Dimensions: ${width} × ${height} px</span>
      </div>
      <div class="summary-actions">
        <button class="link-btn" id="copyNameBtn">Copy file name</button>
      </div>
    `;
    resultsAccordion.classList.remove('hidden');

    const copyBtn = document.getElementById('copyNameBtn');
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(name); copyBtn.textContent = 'Copied ✓'; } catch {}
    };

    try {
      const entry = { id: crypto.randomUUID?.() || String(Date.now()), timestamp: Date.now(), fileName: name, sizeBytes: size, mode: 'png', width, height };
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      hist.unshift(entry);
      while (hist.length > 5) hist.pop();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    } catch {}
  }

  function showResult({ name, blob }, counts) {
    const size = blob.size;
    const url = URL.createObjectURL(blob);
    
    // Show download link at top
    downloadLink.innerHTML = `
      <h2 style="margin: 0 0 12px; color: var(--fg);">✓ Document Ready</h2>
      <a href="${url}" download="${name}">Download ${name}</a>
      <div class="download-info">
        <div>${(size / 1024).toFixed(1)} KB • ${counts.headings} headings • ${counts.tables} tables • ${counts.codeBlocks} code blocks</div>
      </div>
    `;
    downloadSection.classList.remove('hidden');
    
    // Show details in accordion
    resultSummary.innerHTML = `
      <div class="summary-row">
        <strong>File:</strong>
        <code>${name}</code>
        <span>(${(size / 1024).toFixed(1)} KB)</span>
      </div>
      <div class="summary-row">
        <span>Headings: ${counts.headings}</span>
        <span>Tables: ${counts.tables}</span>
        <span>Block Quotes: ${counts.blockQuotes}</span>
        <span>Code Blocks: ${counts.codeBlocks}</span>
      </div>
      <div class="summary-actions">
        <button class="link-btn" id="copyNameBtn">Copy file name</button>
      </div>
    `;
    resultsAccordion.classList.remove('hidden');
    
    const copyBtn = document.getElementById('copyNameBtn');
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(name); copyBtn.textContent = 'Copied ✓'; } catch {}
    };

    // history (localStorage, capped 5)
    try {
      const entry = { id: crypto.randomUUID?.() || String(Date.now()), timestamp: Date.now(), fileName: name, sizeBytes: size, counts };
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      hist.unshift(entry);
      while (hist.length > 5) hist.pop();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    } catch {}
  }

  convertBtn.addEventListener('click', async () => {
    const text = sanitizeRawMarkdown(mdInput.value.trim());
    if (!text) return;

    // Show loading state
    convertBtn.disabled = true;
    convertBtn.classList.add('loading');
    const originalText = convertBtn.textContent;
    convertBtn.textContent = currentMode === 'png' ? 'Rendering...' : 'Converting...';

    try {
      const { tokens, counts } = parseMarkdown(text);
      if (currentMode === 'png') {
        const targetWidth = getTargetPngWidth();
        const pngResult = await buildMermaidPng(tokens, targetWidth);
        showPngResult(pngResult);
        return;
      }

      // Respect Mermaid toggle for DOCX export
      const mermaidEnabled = mermaidToggle && mermaidToggle.checked;
      if (!mermaidEnabled) {
        for (let i = tokens.length - 1; i >= 0; i--) {
          if (tokens[i].type === 'mermaid') tokens.splice(i, 1);
        }
      }
      const { name, blob } = await buildDocxBlob(tokens);
      showResult({ name, blob }, counts);
    } catch (e) {
      console.error('Conversion failed:', e);
      alert('Conversion failed: ' + e.message);
    } finally {
      convertBtn.disabled = false;
      convertBtn.classList.remove('loading');
      convertBtn.textContent = originalText;
    }
  });
})();

