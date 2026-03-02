#!/usr/bin/env node
/* bundle.js -- CLI entry point for doc-creator-cli
   Bundles one or more Markdown files into a single Word (.docx) document. */

'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const minimist = require('minimist');
const { parseMarkdown } = require('./md-parser');
const { writeDocxFile } = require('./docx-builder');

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP = `
doc-creator-cli -- Bundle Markdown files into a Word document

Usage:
  node bundle.js [options] [file1.md file2.md ...]
  node bundle.js --glob "path/to/docs/*.md" [options]

Options:
  --glob, -g      Glob pattern for input files (quoted)
  --output, -o    Output .docx path  (default: bundle_YYYYMMDD_HHmmss.docx)
  --title, -t     Document title / author metadata  (default: "Document Bundle")
  --no-separator  Skip filename label before each file section
  --no-mermaid    Skip Mermaid diagram rendering (faster, no mmdc needed)
  --help, -h      Show this help

Examples:
  node bundle.js --glob "docs/humans/arr_bop/*.md" --output arr_bop.docx --title "ARR BOP Docs"
  node bundle.js 00_overview.md 01_step.md --output combined.docx
`;

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const argv = minimist(process.argv.slice(2), {
  string: ['glob', 'output', 'title'],
  boolean: ['help', 'separator', 'mermaid'],
  alias: { g: 'glob', o: 'output', t: 'title', h: 'help' },
  default: { separator: true, mermaid: true }
});

if (argv.help) { process.stdout.write(HELP + '\n'); process.exit(0); }

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

let files = argv._.map(f => path.resolve(f));

if (argv.glob) {
  const pattern = argv.glob;
  const matched = globSync(pattern, { absolute: true });
  if (!matched.length) {
    process.stderr.write(`[bundle] No files matched glob: ${pattern}\n`);
    process.exit(1);
  }
  files = files.concat(matched);
}

if (!files.length) {
  process.stderr.write('[bundle] No input files. Pass file paths or use --glob.\n');
  process.stderr.write('Run with --help for usage.\n');
  process.exit(1);
}

// Sort alphabetically (preserves numbered prefix ordering like 00_, 01_, ...)
files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

// ---------------------------------------------------------------------------
// Output path
// ---------------------------------------------------------------------------

let outputPath = argv.output;
if (!outputPath) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ]/g, '').slice(0, 14);
  outputPath = path.resolve(`bundle_${stamp}.docx`);
}
if (!outputPath.endsWith('.docx')) outputPath += '.docx';

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function main() {
  process.stdout.write(`[bundle] Input files (${files.length}):\n`);
  files.forEach(f => process.stdout.write(`  ${path.basename(f)}\n`));
  process.stdout.write(`[bundle] Output: ${outputPath}\n`);

  const tokenSets = [];
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      process.stderr.write(`[bundle] File not found, skipping: ${filePath}\n`);
      continue;
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const { tokens, counts } = parseMarkdown(text);
    process.stdout.write(`  Parsed ${path.basename(filePath)}: ${counts.headings} headings, ${counts.tables} tables, ${counts.codeBlocks} code blocks\n`);
    tokenSets.push({ filename: filePath, tokens });
  }

  if (!tokenSets.length) {
    process.stderr.write('[bundle] No files could be parsed. Aborting.\n');
    process.exit(1);
  }

  const options = {
    title: argv.title || 'Document Bundle',
    separator: argv.separator,
    mermaid: argv.mermaid
  };

  process.stdout.write('[bundle] Building DOCX...\n');
  await writeDocxFile(outputPath, tokenSets, options);
  process.stdout.write(`[bundle] Done: ${outputPath}\n`);
}

main().catch(err => {
  process.stderr.write(`[bundle] Fatal error: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
