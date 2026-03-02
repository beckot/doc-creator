# doc-creator-cli

CLI tool that bundles one or more Markdown files into a single Word (.docx) document.
Reuses the parser, OOXML templates, and styling from the [doc-creator PWA](../pwa/).

## Install

```
cd cli
npm install
```

For Mermaid diagram rendering (optional, adds ~300 MB via Playwright):

```
npm install --include=dev
# or globally:
npm install -g @mermaid-js/mermaid-cli
```

If mmdc is not available, Mermaid diagrams are replaced with a grey placeholder line and
the rest of the document builds normally.

## Usage

```
node bundle.js [options] [file1.md file2.md ...]
node bundle.js --glob "path/to/docs/*.md" [options]
```

### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--glob` | `-g` | | Glob pattern for input files |
| `--output` | `-o` | `bundle_TIMESTAMP.docx` | Output file path |
| `--title` | `-t` | `Document Bundle` | Word metadata title / author |
| `--no-separator` | | separator on | Skip the filename label inserted before each file |
| `--no-mermaid` | | mermaid on | Skip Mermaid rendering (faster) |
| `--help` | `-h` | | Show usage |

## Examples

Bundle the ARR BOP docs into one Word file:

```
node bundle.js \
  --glob "C:/dev/bw25/daip-edp-gold-template/docs/humans/arr_bop/*.md" \
  --output arr_bop_docs.docx \
  --title "ARR BOP Pipeline Documentation"
```

Bundle specific files in a custom order:

```
node bundle.js intro.md body.md appendix.md --output report.docx
```

Quick run without Mermaid (no mmdc required):

```
node bundle.js --glob "docs/*.md" --no-mermaid --output draft.docx
```

## Output styling

Inherited from doc-creator PWA (`pwa/docx-templates.js`):

- Font: Aptos, 11pt body
- Headings: H1 20pt bold / H2 16pt / H3 13pt
- Tables: light-gray header row, alternating row shading
- Code blocks: Consolas 10pt, light background, SQL and Python syntax highlighting
- Block quotes: italic, left border

## File separator

By default a small grey filename label (`00_README_arr_bop_overview.md`) is inserted before each
file section, preceded by a page break. Use `--no-separator` to suppress the label (page breaks
are still inserted between files).

## Architecture

| File | Purpose |
|------|---------|
| `bundle.js` | CLI entry point |
| `md-parser.js` | Markdown parser (ported from `pwa/app.js`) |
| `docx-builder.js` | DOCX assembler using JSZip |
| `docx-templates.js` | OOXML style templates (ported from `pwa/docx-templates.js`) |
| `mermaid-render.js` | Mermaid PNG rendering via mmdc shell-out |
