/* DOCX builder -- Node.js port of pwa/app.js DOCX assembly logic.
   Accepts multiple token sets (one per input file) and bundles them
   into a single Word document with page breaks between files. */

'use strict';

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const T = require('./docx-templates');
const { renderMermaidToPng, isMmdcAvailable } = require('./mermaid-render');

// ---------------------------------------------------------------------------
// Syntax highlighting (ported from pwa/app.js lines 555-664, browser-agnostic)
// ---------------------------------------------------------------------------

const COLORS = {
  keyword: '0000FF',
  string: '008000',
  comment: '008000',
  number: '098658',
  function: '795E26'
};

const SQL_KEYWORDS = /\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|OUTER|FULL|CROSS|ON|AND|OR|NOT|IN|EXISTS|LIKE|BETWEEN|IS|NULL|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|DATABASE|SCHEMA|PRIMARY|FOREIGN|KEY|CONSTRAINT|REFERENCES|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MIN|MAX|CAST|CONVERT|WITH|RECURSIVE|PARTITION BY|OVER|ROW_NUMBER|RANK|DENSE_RANK|BEGIN|COMMIT|ROLLBACK|TRANSACTION|DECLARE|VARCHAR|INT|INTEGER|BIGINT|DECIMAL|NUMERIC|DATE|DATETIME|TIMESTAMP|TEXT|BLOB|BOOLEAN|IF|ELSIF|WHILE|LOOP|PROCEDURE|FUNCTION|RETURNS|TRIGGER|COLUMN|ADD|MODIFY|GRANT|REVOKE|TRUNCATE|COMMENT|STRING|DEFAULT)\b/gi;
const PYTHON_KEYWORDS = /\b(def|class|if|elif|else|for|while|break|continue|return|yield|import|from|as|try|except|finally|raise|with|lambda|pass|assert|global|nonlocal|del|True|False|None|and|or|not|in|is|async|await|match|case)\b/g;
const FUNCTION_PATTERN = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g;
const NUMBER_PATTERN = /\b(\d+\.?\d*|\.\d+|0x[0-9a-fA-F]+)\b/g;
const STRING_PATTERN = /(["'])((?:\\.|(?!\1).)*?)\1/g;
const SQL_COMMENT = /--.*$/gm;
const PYTHON_COMMENT = /#.*$/gm;

function highlightWithPatterns(code, patterns) {
  const matches = [];
  patterns.forEach((p, pIdx) => {
    const regex = new RegExp(p.pattern.source, p.pattern.flags);
    let m;
    while ((m = regex.exec(code)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], color: p.color, priority: pIdx });
    }
  });
  matches.sort((a, b) => a.start !== b.start ? a.start - b.start : b.end - a.end || a.priority - b.priority);
  const filtered = [];
  let lastEnd = 0;
  for (const m of matches) { if (m.start >= lastEnd) { filtered.push(m); lastEnd = m.end; } }
  const tokens = [];
  let lastIdx = 0;
  for (const m of filtered) {
    if (m.start > lastIdx) tokens.push({ text: code.substring(lastIdx, m.start) });
    tokens.push({ text: m.text, color: m.color });
    lastIdx = m.end;
  }
  if (lastIdx < code.length) tokens.push({ text: code.substring(lastIdx) });
  return tokens.length > 0 ? tokens : [{ text: code }];
}

function highlightCode(code, lang) {
  lang = (lang || '').toLowerCase();
  if (lang === 'sql') {
    return highlightWithPatterns(code, [
      { pattern: SQL_COMMENT, color: COLORS.comment },
      { pattern: STRING_PATTERN, color: COLORS.string },
      { pattern: SQL_KEYWORDS, color: COLORS.keyword },
      { pattern: FUNCTION_PATTERN, color: COLORS.function },
      { pattern: NUMBER_PATTERN, color: COLORS.number }
    ]);
  }
  if (lang === 'python' || lang === 'py') {
    return highlightWithPatterns(code, [
      { pattern: PYTHON_COMMENT, color: COLORS.comment },
      { pattern: STRING_PATTERN, color: COLORS.string },
      { pattern: PYTHON_KEYWORDS, color: COLORS.keyword },
      { pattern: FUNCTION_PATTERN, color: COLORS.function },
      { pattern: NUMBER_PATTERN, color: COLORS.number }
    ]);
  }
  return [{ text: code }];
}

// ---------------------------------------------------------------------------
// Heading anchors / bookmarks (ported from pwa/app.js)
// ---------------------------------------------------------------------------

function slugify(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function getPlainText(runs) {
  return (runs || []).map(r => r.text || '').join('');
}

function buildHeadingAnchors(tokens) {
  const slugCounts = new Map();
  const usedBookmarks = new Set();
  const headingBookmarks = new Map();
  const anchorToBookmark = new Map();
  for (const token of tokens) {
    if (token.type !== 'heading') continue;
    const baseSlug = slugify(getPlainText(token.content));
    const count = slugCounts.get(baseSlug) || 0;
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
    slugCounts.set(baseSlug, count + 1);
    let name = slug.substring(0, 40);
    if (!/^[a-z]/.test(name)) name = `h-${name}`;
    let candidate = name;
    let suffix = 1;
    while (usedBookmarks.has(candidate)) {
      const s = `-${suffix++}`;
      candidate = name.substring(0, Math.max(1, 40 - s.length)) + s;
    }
    usedBookmarks.add(candidate);
    headingBookmarks.set(token, candidate);
    anchorToBookmark.set(slug, candidate);
  }
  return { headingBookmarks, anchorToBookmark };
}

// ---------------------------------------------------------------------------
// OOXML run and document builders (ported from pwa/app.js)
// ---------------------------------------------------------------------------

function buildRuns(runs, anchorToBookmark) {
  let xml = '';
  for (const run of (runs || [])) {
    if (run.anchor) {
      const target = (anchorToBookmark && anchorToBookmark.get(run.anchor)) || run.anchor;
      xml += `<w:hyperlink w:anchor="${T.escapeXml(target)}">`;
      xml += '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>';
      xml += `<w:t>${T.escapeXml(run.text)}</w:t></w:r></w:hyperlink>`;
      continue;
    }
    xml += '<w:r>';
    if (run.bold || run.italic || run.code || run.link) {
      xml += '<w:rPr>';
      if (run.bold) xml += '<w:b/>';
      if (run.italic) xml += '<w:i/>';
      if (run.code) xml += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:shd w:val="clear" w:fill="F4F4F4"/>';
      if (run.link) xml += '<w:color w:val="0563C1"/>';
      xml += '</w:rPr>';
    }
    xml += `<w:t xml:space="preserve">${T.escapeXml(run.text)}</w:t></w:r>`;
  }
  return xml;
}

function buildTokensXml(tokens, imageMap, anchorToBookmark, listCounterStart = 0) {
  let xml = '';
  let listCounter = listCounterStart;

  for (const token of tokens) {
    if (token.type === 'hr') {
      xml += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr></w:pPr><w:r><w:t></w:t></w:r></w:p>';

    } else if (token.type === 'heading') {
      const bookmark = anchorToBookmark && anchorToBookmark.get
        ? [...anchorToBookmark.entries()].find(([, v]) => v === (new Map([[token, '']]).get(token) || ''))?.[1] || slugify(getPlainText(token.content))
        : slugify(getPlainText(token.content));
      // Use headingBookmarks map passed via closure -- see buildDocumentXml
      const bm = imageMap.__headingBookmarks && imageMap.__headingBookmarks.get(token)
        || slugify(getPlainText(token.content));
      const bmId = Math.floor(Math.random() * 1000000);
      xml += `<w:p><w:pPr><w:pStyle w:val="Heading${token.level}"/></w:pPr>`;
      xml += `<w:bookmarkStart w:id="${bmId}" w:name="${T.escapeXml(bm)}"/>`;
      xml += buildRuns(token.content, anchorToBookmark);
      xml += `<w:bookmarkEnd w:id="${bmId}"/></w:p>`;

    } else if (token.type === 'paragraph') {
      xml += '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>';
      xml += buildRuns(token.content, anchorToBookmark);
      xml += '</w:p>';

    } else if (token.type === 'blockquote') {
      for (const sub of token.content) {
        xml += '<w:p><w:pPr><w:pStyle w:val="BlockQuote"/></w:pPr>';
        if (sub.type === 'paragraph') xml += buildRuns(sub.content, anchorToBookmark);
        xml += '</w:p>';
      }

    } else if (token.type === 'code') {
      for (const line of token.content.split('\n')) {
        xml += '<w:p><w:pPr><w:pStyle w:val="CodeBlock"/></w:pPr>';
        for (const seg of highlightCode(line, token.lang)) {
          xml += '<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/>';
          if (seg.color) xml += `<w:color w:val="${seg.color}"/>`;
          xml += `</w:rPr><w:t xml:space="preserve">${T.escapeXml(seg.text)}</w:t></w:r>`;
        }
        xml += '</w:p>';
      }

    } else if (token.type === 'list') {
      const baseUnordered = (listCounter * 2) + 1;
      const baseOrdered = (listCounter * 2) + 2;
      listCounter++;
      for (const item of token.items) {
        const ilvl = item.level || 0;
        const numId = item.ordered ? baseOrdered : baseUnordered;
        xml += '<w:p><w:pPr><w:pStyle w:val="Normal"/>';
        xml += `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`;
        xml += '</w:pPr>';
        xml += buildRuns(item.runs, anchorToBookmark);
        xml += '</w:p>';
      }

    } else if (token.type === 'mermaid') {
      const info = imageMap[token.content];
      if (info) {
        const { rId, widthEmu, heightEmu, id, name } = info;
        xml += '<w:p><w:r><w:drawing>';
        xml += `<wp:inline distT="0" distB="0" distL="0" distR="0">`;
        xml += `<wp:extent cx="${widthEmu}" cy="${heightEmu}"/>`;
        xml += `<wp:docPr id="${id}" name="${T.escapeXml(name)}"/>`;
        xml += '<wp:cNvGraphicFramePr/>';
        xml += '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">';
        xml += '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Thumbnail"/><pic:cNvPicPr/></pic:nvPicPr>';
        xml += `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`;
        xml += `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`;
        xml += '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
      } else {
        // Placeholder when Mermaid rendering skipped or failed
        xml += '<w:p><w:pPr><w:pStyle w:val="CodeBlock"/></w:pPr>';
        xml += `<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:color w:val="888888"/></w:rPr>`;
        xml += `<w:t>[Mermaid diagram -- run with mmdc available to embed as image]</w:t></w:r></w:p>`;
      }
    }
  }
  return { xml, listCounter };
}

function buildDocumentXml(tokenSets, imageMap, options = {}) {
  // Build a combined anchor map across all token sets
  const allTokens = tokenSets.flatMap(s => s.tokens);
  const { headingBookmarks, anchorToBookmark } = buildHeadingAnchors(allTokens);
  // Attach headingBookmarks to imageMap so buildTokensXml can access it
  imageMap.__headingBookmarks = headingBookmarks;

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  xml += '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  xml += ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  xml += ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  xml += ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
  xml += ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">';
  xml += '<w:body>';

  let listCounter = 0;
  const separator = options.separator !== false; // default true

  for (let s = 0; s < tokenSets.length; s++) {
    const { filename, tokens } = tokenSets[s];

    // Page break before every file except the first
    if (s > 0) {
      xml += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }

    // Optional filename separator heading
    if (separator && filename) {
      const label = T.escapeXml(path.basename(filename));
      xml += '<w:p><w:pPr><w:pStyle w:val="Normal"/>';
      xml += '<w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/>';
      xml += '</w:pPr>';
      xml += `<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr>`;
      xml += `<w:t>${label}</w:t></w:r></w:p>`;
    }

    const result = buildTokensXml(tokens, imageMap, anchorToBookmark, listCounter);
    xml += result.xml;
    listCounter = result.listCounter;
  }

  xml += '</w:body></w:document>';
  return xml;
}

// ---------------------------------------------------------------------------
// Main builder: accepts tokenSets, returns a Buffer
// ---------------------------------------------------------------------------

async function buildDocx(tokenSets, options = {}) {
  const zip = new JSZip();
  const imageMap = {};
  let imageIndex = 1;

  const renderMermaid = options.mermaid !== false;

  if (renderMermaid && !isMmdcAvailable()) {
    process.stderr.write('[docx-builder] WARNING: mmdc not found. Mermaid diagrams will show as placeholders.\n');
    process.stderr.write('  Install with: npm install -g @mermaid-js/mermaid-cli\n');
  }

  // Render all Mermaid tokens across all files
  if (renderMermaid) {
    for (const { tokens } of tokenSets) {
      for (const t of tokens.filter(t => t.type === 'mermaid')) {
        if (imageMap[t.content]) continue; // de-duplicate identical diagrams
        const pngBuf = await renderMermaidToPng(t.content);
        if (!pngBuf) continue;

        const fileName = `image${imageIndex}.png`;
        zip.file(`word/media/${fileName}`, pngBuf);

        // Default display size: full text width (6.5 inches = 5943600 EMU), 16:9 ratio
        const widthEmu = 5943600;
        const heightEmu = Math.round(widthEmu * (9 / 16));
        const rId = `rIdImg${imageIndex}`;
        imageMap[t.content] = { rId, widthEmu, heightEmu, id: 500 + imageIndex, name: fileName };
        imageIndex++;
      }
    }
  }

  // Build document XML
  const docXml = buildDocumentXml(tokenSets, imageMap, options);

  // Assemble document relationships (static + image entries)
  let rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  rels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  rels += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
  rels += '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>';
  for (const info of Object.values(imageMap)) {
    if (!info.rId) continue;
    rels += `<Relationship Id="${info.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${info.name}"/>`;
  }
  rels += '</Relationships>';

  const creator = options.title || 'doc-creator-cli';

  zip.file('[Content_Types].xml', T.getContentTypes());
  zip.file('_rels/.rels', T.getRootRels());
  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', rels);
  zip.file('word/styles.xml', T.getStyles());
  zip.file('word/numbering.xml', T.getNumbering());
  zip.file('docProps/core.xml', T.getCoreProps(creator));

  return zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/**
 * Build and write a DOCX file to disk.
 * @param {string} outputPath  Destination .docx path
 * @param {Array<{filename: string, tokens: Token[]}>} tokenSets
 * @param {object} options  { title, separator, mermaid }
 */
async function writeDocxFile(outputPath, tokenSets, options = {}) {
  const buf = await buildDocx(tokenSets, options);
  fs.writeFileSync(outputPath, buf);
}

module.exports = { buildDocx, writeDocxFile };
