# Markdown to DOCX PWA

Zero-install Progressive Web App that converts Markdown to styled Microsoft Word DOCX files, with mermaid diagram rendering and offline capability.

## Features

- **Zero Installation**: Works directly in browser, no npm/Python/server required
- **Offline-First**: PWA caching enables full offline conversion after first load
- **Word Compatibility**: Generates valid OOXML compatible with Microsoft Word (desktop & mobile)
- **Rich Styling**: Aptos font hierarchy, proper heading sizes, styled blockquotes & code blocks
- **Tables**: Full table support with banded rows, header shading, and consistent column widths
- **Nested Lists**: Up to 3 levels of indentation (bullets & numbered)
- **Mermaid Diagrams**: Renders flowcharts, sequence diagrams, ERDs to embedded PNG images
- **Inline Formatting**: Bold, italic, code, and links preserved
- **Multi-File Concatenation**: Upload multiple `.md`/`.txt` files (alphabetically merged)
- **Samsung Galaxy S25 Optimized**: Tested for <3s conversion on mobile

## Supported Markdown

| Element | Syntax | Notes |
|---------|--------|-------|
| Headings | `# H1` to `###### H6` | Aptos 48pt → 20pt |
| Bold | `**text**` | |
| Italic | `*text*` | |
| Inline Code | `` `code` `` | |
| Links | `[text](url)` | Blue underline |
| Blockquotes | `> quote` | Gray bg + left border, multi-paragraph |
| Code Blocks | ` ```lang ` | Consolas 9pt, gray bg |
| Mermaid | ` ```mermaid ` | Rendered to PNG, embedded |
| Tables | `\| Col \| Col \|` | Banded rows, header shading |
| Unordered Lists | `- item` | Bullets, 3 levels (4/8 space indent) |
| Ordered Lists | `1. item` | Decimals, 3 levels |

## Quick Start

### Local (Same Wi-Fi Network)

1. **Start server** (requires Python 3):
   ```powershell
   cd pwa
   python -m http.server 8080
   ```

2. **Find your PC's IP**:
   ```powershell
   ipconfig
   ```
   Look for IPv4 address (e.g., `192.168.1.100`)

3. **Access from phone/PC**:
   - Desktop: `http://localhost:8080`
   - Mobile (same Wi-Fi): `http://192.168.1.100:8080`

4. **Install as PWA** (optional):
   - Chrome: Menu → Install app / Add to Home screen
   - After install, works fully offline

### GitHub Pages (Public Hosting)

1. Create GitHub repo and push `pwa/` folder contents to root
2. Enable GitHub Pages (Settings → Pages → main branch)
3. Access at: `https://<username>.github.io/<repo-name>/`
4. Install as PWA on any device

## Usage

1. **Paste or upload markdown**
   - Textarea: Direct paste
   - File picker: Upload one or multiple `.md`/`.txt` files

2. **Convert**
   - Click "Convert to DOCX"
   - Download appears with filename and size

3. **Open in Word**
   - Desktop: Double-click `.docx`
   - Android: Open with Microsoft Word app
   - Verify styles, tables, diagrams render correctly

## Architecture

```
pwa/
├── index.html          # UI (textarea, file input, result panel)
├── styles.css          # Dark theme styling
├── app.js              # Core converter (parseMarkdown, buildDocxBlob, OOXML generation)
├── docx-templates.js   # OOXML XML templates (ContentTypes, Styles, Numbering, Rels)
├── manifest.json       # PWA manifest (name, theme, icons)
├── service-worker.js   # Offline caching (precache strategy, v6)
├── libs/
│   ├── jszip.min.js    # ZIP assembly for DOCX (v3.10.1)
│   └── mermaid.min.js  # Diagram rendering (v10)
└── tests/
    ├── test-harness.html   # Test runner UI
    ├── tests.js            # Automated test cases with golden assertions
    └── cases/*.md          # Test markdown files
```

### Key Components

- **Parser** (`parseMarkdown`): Converts markdown text → intermediate token representation (IR)
- **OOXML Generator** (`buildDocumentXml`): Transforms tokens → Word XML with proper styles
- **DOCX Assembler** (`buildDocxBlob`): Uses JSZip to package XML + images into valid DOCX ZIP
- **Mermaid Renderer**: SVG → Canvas → PNG → embedded `<w:drawing>` with relationships
- **Sanitization**: Strips null bytes, scripts, event handlers; caps input at 250KB

## Testing

### Manual Test

1. Open `http://localhost:8080`
2. Paste sample markdown (see `tests/cases/` for examples)
3. Convert and verify DOCX opens in Word without errors

### Automated Test Suite

1. Open `http://localhost:8080/tests/test-harness.html`
2. View pass/fail for 7 test cases:
   - **basic**: Simple heading + paragraph
   - **headings**: All 6 heading levels
   - **table**: Multi-column table with empty cells
   - **blockquote**: Multi-paragraph quote
   - **lists-nested**: 3-level bullets & decimals
   - **code-mermaid**: Mermaid diagram + code block
   - **large**: Mixed content (stress test)

3. **Golden assertions**:
   - Counts: headings, tables, blockquotes, code blocks
   - Structural: paragraph count, heading styles, table rows, list levels, images

### Test-Driven Development

Tests use `window.DocConverter` API:
```javascript
const { tokens, counts } = DocConverter.parseMarkdown(markdown);
const { name, blob } = await DocConverter.buildDocxBlob(tokens);
// Unzip blob with JSZip and assert XML structure
```

## Security

- **Input sanitization**: Null bytes removed, 250KB cap
- **Mermaid sanitization**: Scripts & event handlers stripped, 20KB cap
- **XML escaping**: All user text escaped via `escapeXml()` before OOXML insertion
- **No remote execution**: All processing client-side, no server upload

## Performance

- **Target**: <3s conversion on Samsung Galaxy S25
- **Optimization**: Single-pass parsing, minimal DOM manipulation, efficient ZIP generation
- **Tested**: Sample ERD document (129 lines, 4 tables, 1 mermaid) converts in ~1-2s

## Offline Capability

- **First load**: Downloads all assets (~500KB)
- **Service worker**: Precaches HTML, CSS, JS, libraries, test files
- **Subsequent loads**: Instant from cache, no network required
- **Updates**: New service worker version forces cache refresh

## Browser Compatibility

- **Desktop**: Chrome, Edge, Firefox, Safari (modern versions)
- **Mobile**: Chrome (Android), Safari (iOS)
- **Recommended**: Chrome for best PWA experience and service worker support

## Troubleshooting

### Word shows "unreadable content" error
- Check browser console for errors during conversion
- Verify DOCX downloads completely (check file size)
- Try simpler markdown first (heading + paragraph)

### Tables misaligned
- Ensure separator row has consistent pipe count: `|---|---|---|`
- All rows should have same column count as header

### Mermaid not rendering
- Diagrams render automatically (no toggle needed in current version)
- Check syntax with [Mermaid Live Editor](https://mermaid.live)
- Large/complex diagrams may timeout (20KB source limit)

### 404 errors in test harness
- Clear browser cache: DevTools → Application → Clear site data
- Unregister service worker: Application → Service Workers → Unregister
- Hard refresh: `Ctrl+Shift+R`

### Styles don't match PRD
- Expected: Aptos font, specific heading sizes (48pt → 20pt)
- If different: Word may be overriding with document theme
- Verify by inspecting paragraph style in Word (Home → Styles → Manage)

## Development

### Adding Features

1. **New markdown syntax**: Update `parseMarkdown()` to create token, add rendering in `buildDocumentXml()`
2. **New styles**: Extend `getStyles()` in `docx-templates.js`, reference in XML generation
3. **Testing**: Add case to `tests/cases/`, update `tests.js` with expectations

### Debugging

- **Parser**: `console.log(DocConverter.parseMarkdown(text))` to inspect IR
- **XML**: Add breakpoint in `buildDocumentXml()`, inspect generated XML string
- **DOCX**: Unzip generated `.docx` with 7-Zip, inspect `word/document.xml` manually

### Cache Management

Bump `CACHE_NAME` in `service-worker.js` after code changes:
```javascript
const CACHE_NAME = 'md-docx-pwa-v7'; // Increment version
```

## License

MIT (or specify your license)

## Contributing

PRs welcome for:
- Additional markdown syntax support
- Performance optimizations
- Mobile UX improvements
- Test coverage expansion

## Credits

- **JSZip**: DOCX ZIP assembly
- **Mermaid**: Diagram rendering
- **OOXML spec**: Microsoft Office Open XML standard
