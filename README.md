# Markdown → Word (DOCX) Converter

**Zero-install, offline-capable Progressive Web App for converting Markdown to professionally formatted Word documents.**

🌐 **Live App**: [https://beckot.github.io/doc-creator/](https://beckot.github.io/doc-creator/)

## Features

- ✅ **Zero installation** - Works in any modern browser
- 📴 **Offline-capable** - PWA with full offline support after first load
- 🎨 **Professional styling** - Aptos font, 1.5× line spacing, generous margins
- 📊 **Mermaid diagrams** - Optional high-resolution diagram rendering
- 📱 **Mobile & Desktop** - Responsive design for all devices
- 🔒 **Privacy-first** - All processing happens in your browser (no data sent to servers)
- ⚡ **Live updates** - Service worker auto-updates when new versions are available

## What You Can Convert

- **Headings** (H1-H6)
- **Bold**, *Italic*, `Code`, [Links](url)
- Lists (numbered, bullets, nested)
- Tables with header styling and banded rows
- Code blocks with syntax highlighting
- Blockquotes
- Horizontal rules
- **Mermaid diagrams** (flowcharts, sequence diagrams, ERDs, etc.)

## Usage

### Online (Recommended)
1. Visit [https://beckot.github.io/doc-creator/](https://beckot.github.io/doc-creator/)
2. Paste your Markdown content
3. Optionally enable Mermaid diagram rendering
4. Click "Convert to DOCX"
5. Download your formatted Word document

### Install as PWA (Mobile/Desktop)
1. Open the app in Chrome/Edge/Safari
2. Look for "Install App" or "Add to Home Screen"
3. Use offline anytime

### Local Development
```powershell
# Serve locally
python -m http.server 8080 -d .\pwa

# Open http://localhost:8080/?dev (dev mode disables service worker for live reload)
```

## Output Format

Generated DOCX files include:

- **Professional typography**: Aptos font family
- **Generous spacing**: 1.5× line height, 8pt paragraph spacing
- **Hierarchical headings**: H1 (18pt), H2 (16pt), H3 (13pt), H4-H6
- **Styled tables**: Header shading, alternating row colors
- **High-res images**: Mermaid diagrams rendered at 3× resolution
- **Proper list formatting**: Hierarchical numbering (1., 1.1., 1.1.1.) and bullets

## Architecture

- `pwa/index.html` - Main PWA interface
- `pwa/app.js` - Markdown parser & DOCX generator
- `pwa/docx-templates.js` - OOXML templates for Word structure
- `pwa/service-worker.js` - Offline caching & auto-updates
- `pwa/styles.css` - Responsive UI styling
- `.github/workflows/deploy.yml` - Automated GitHub Pages deployment
- `.github/scripts/security-check.ps1` - Pre-deployment security scanning

## Security

✅ **No secrets in repository** - Automated security scans on every push  
✅ **Client-side only** - No backend server or data transmission  
✅ **Open source** - Full code transparency  

See [`.github/SECURITY.md`](.github/SECURITY.md) for details.

## Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ✅ Samsung Internet

Requires: Modern browser with ES6+ support, Web Workers, and Service Worker API.

## Contributing

Found a bug or have a feature request? Open an issue or submit a pull request!

## License

MIT License - See LICENSE file for details.

### Markdown
- Headers (H1-H6)
- **Bold**, *italic*, `code`
- Lists (bullet & numbered)
- Code blocks with syntax highlighting
- Tables with banded rows
- Links
- Horizontal rules

### Mermaid Diagrams
All Mermaid diagram types:
- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- ER diagrams
- And more...

## Configuration

### Web UI
- Accessible at http://localhost:5000
- Max file size: 50MB
- Outputs stored in `outputs/` folder

### API
```python
# Enable verbose logging
converter = DocumentConverterAPI(verbose=True)

# Customize output location
result = converter.convert_content_to_docx(
    content="...",
    output_path="path/to/output.docx",
    create_run_folder=True  # or False
)
```
