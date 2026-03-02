/* Mermaid diagram rendering for Node.js via mmdc (mermaid-cli) shell-out */

'use strict';

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Check once at module load whether mmdc is available on PATH
let _mmdcAvailable = null;
function isMmdcAvailable() {
  if (_mmdcAvailable !== null) return _mmdcAvailable;
  try {
    const cmd = process.platform === 'win32' ? 'where mmdc' : 'which mmdc';
    execSync(cmd, { stdio: 'pipe' });
    _mmdcAvailable = true;
  } catch {
    _mmdcAvailable = false;
  }
  return _mmdcAvailable;
}

/**
 * Render a Mermaid source string to a PNG Buffer.
 * Returns null if mmdc is unavailable or rendering fails.
 * @param {string} source  Mermaid diagram source
 * @returns {Promise<Buffer|null>}
 */
async function renderMermaidToPng(source) {
  if (!isMmdcAvailable()) return null;

  const id = crypto.randomBytes(8).toString('hex');
  const tmpDir = os.tmpdir();
  const inputFile = path.join(tmpDir, `mermaid-${id}.mmd`);
  const outputFile = path.join(tmpDir, `mermaid-${id}.png`);

  try {
    fs.writeFileSync(inputFile, source, 'utf8');
    execFileSync('mmdc', [
      '-i', inputFile,
      '-o', outputFile,
      '-b', 'white',
      '-w', '1600'
    ], { stdio: 'pipe', timeout: 30000 });

    if (!fs.existsSync(outputFile)) return null;
    const buf = fs.readFileSync(outputFile);
    return buf;
  } catch (err) {
    process.stderr.write(`[mermaid-render] render failed: ${err.message}\n`);
    return null;
  } finally {
    try { fs.unlinkSync(inputFile); } catch {}
    try { fs.unlinkSync(outputFile); } catch {}
  }
}

module.exports = { renderMermaidToPng, isMmdcAvailable };
