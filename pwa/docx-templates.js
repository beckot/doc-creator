/* OOXML templates for DOCX generation (Office Open XML) */

// [Content_Types].xml - defines MIME types for parts
function getContentTypes() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
}

// _rels/.rels - root relationships
function getRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;
}

// word/_rels/document.xml.rels - document relationships
function getDocumentRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;
}

// word/styles.xml - document styles (Enhanced Professional Style Guide)
// Optimized for scannability, reduced cognitive load, "airy" vertical rhythm
// Aptos font, grayscale palette, generous spacing
function getStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <!-- Document defaults -->
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:cs="Aptos"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="000000"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto" w:before="160" w:after="160"/>
        <w:jc w:val="left"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <!-- Normal style: 11pt Aptos, 1.5 line spacing, 8pt before/after for breathing room -->
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="360" w:lineRule="auto" w:before="160" w:after="160"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:sz w:val="22"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Heading 1: 20pt Bold, 18pt before / 12pt after - Major section breaks -->
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="360" w:after="240"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="40"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Heading 2: 16pt Bold, 14pt before / 8pt after - Subsections -->
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="280" w:after="160"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="32"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Heading 3: 13pt Semibold, 10pt before / 6pt after - Sub-subsections -->
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="200" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="26"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Heading 4: 11pt Bold, 8pt before / 4pt after -->
  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="Heading 4"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="160" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="22"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Heading 5 -->
  <w:style w:type="paragraph" w:styleId="Heading5">
    <w:name w:val="Heading 5"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="160" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="22"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Heading 6 -->
  <w:style w:type="paragraph" w:styleId="Heading6">
    <w:name w:val="Heading 6"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="160" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="22"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Block Quote: 11pt Italic #444, left border #999 1pt, generous indent -->
  <w:style w:type="paragraph" w:styleId="BlockQuote">
    <w:name w:val="Quote"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="160" w:after="160"/>
      <w:ind w:left="720" w:right="240"/>
      <w:pBdr>
        <w:left w:val="single" w:sz="6" w:space="24" w:color="999999"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:i/>
      <w:sz w:val="22"/>
      <w:color w:val="444444"/>
    </w:rPr>
  </w:style>

  <!-- Code Block: Consolas 10pt, background #F4F4F4, 0.5pt border #DDDDDD, generous padding -->
  <w:style w:type="paragraph" w:styleId="CodeBlock">
    <w:name w:val="Code Block"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="120" w:after="120" w:line="300" w:lineRule="auto"/>
      <w:ind w:left="120" w:right="120"/>
      <w:shd w:val="clear" w:color="auto" w:fill="F8F8F8"/>
      <w:pBdr>
        <w:top w:val="single" w:sz="4" w:space="4" w:color="DDDDDD"/>
        <w:left w:val="single" w:sz="4" w:space="4" w:color="DDDDDD"/>
        <w:bottom w:val="single" w:sz="4" w:space="4" w:color="DDDDDD"/>
        <w:right w:val="single" w:sz="4" w:space="4" w:color="DDDDDD"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
      <w:sz w:val="20"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Table Grid: borders #999999 0.5pt, 10pt font, 12pt spacing before/after -->
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:basedOn w:val="TableNormal"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="999999"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="999999"/>
      </w:tblBorders>
      <w:tblCellSpacing w:w="0" w:type="dxa"/>
    </w:tblPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:sz w:val="20"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>

  <!-- Hyperlink style: blue underlined for internal TOC links -->
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr>
      <w:color w:val="0563C1"/>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>

  <!-- Table Normal (base): 6pt vertical / 8pt horizontal padding for breathing room -->
  <w:style w:type="table" w:default="1" w:styleId="TableNormal">
    <w:name w:val="Normal Table"/>
    <w:tblPr>
      <w:tblCellMar>
        <w:top w:w="120" w:type="dxa"/>
        <w:left w:w="160" w:type="dxa"/>
        <w:bottom w:w="120" w:type="dxa"/>
        <w:right w:w="160" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:sz w:val="20"/>
    </w:rPr>
  </w:style>
</w:styles>`;
}

// word/numbering.xml - list numbering definitions
function getNumbering() {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`;

  // Generate 100 unique abstract numbering definitions (50 bullets + 50 numbers)
  // Each list will get its own abstractNumId to ensure proper restart behavior
  for (let abstractId = 0; abstractId < 100; abstractId++) {
    const isBullet = (abstractId % 2 === 0);
    xml += `\n  <w:abstractNum w:abstractNumId="${abstractId}">`;
    xml += '\n    <w:multiLevelType w:val="multilevel"/>';
    
    if (isBullet) {
      // Bullet list with proper indentation
      xml += '\n    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>';
      xml += '\n    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="◦"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>';
      xml += '\n    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="▪"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl>';
    } else {
      // Numbered list with hierarchical numbering (1., 1.1., 1.1.1.)
      xml += '\n    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>';
      xml += '\n    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1.%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="540"/></w:pPr></w:lvl>';
      xml += '\n    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1.%2.%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="720"/></w:pPr></w:lvl>';
    }
    xml += '\n  </w:abstractNum>';
  }

  // Generate concrete numbering instances (1-100) that each reference a unique abstractNum
  for (let numId = 1; numId <= 100; numId++) {
    // Alternate between bullets (even abstractId) and numbers (odd abstractId)
    const abstractId = (numId - 1);
    xml += `\n  <w:num w:numId="${numId}"><w:abstractNumId w:val="${abstractId}"/></w:num>`;
  }
  
  xml += '\n</w:numbering>';
  return xml;
}

// docProps/core.xml - document metadata
function getCoreProps(creator = 'Markdown to DOCX Converter') {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>${escapeXml(creator)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(creator)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

// Utility: escape XML special characters
function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Export for use in app.js
window.DOCXTemplates = {
  getContentTypes,
  getRootRels,
  getDocumentRels,
  getStyles,
  getNumbering,
  getCoreProps,
  escapeXml
};
