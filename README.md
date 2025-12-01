# Document Converter

Convert Markdown/text files to beautifully formatted DOCX documents with Mermaid diagrams.

## Features
- **Three input modes**: Paste markdown, upload files, or enter file paths
- **Mermaid diagram support**: Automatic high-resolution rendering
- **Professional styling**: Aptos font, proper spacing, formatted tables
- **Web UI**: Simple browser interface
- **CLI**: Command-line tool (original functionality)
- **API**: Python API for programmatic use

## Quick Start

### Option 1: Web UI (New!)
```bash
python web_ui.py
```
Then open http://localhost:5000

### Option 2: API (Programmatic)
```python
from doc_converter_api import DocumentConverterAPI

converter = DocumentConverterAPI()

# Paste markdown
result = converter.convert_content_to_docx(
    content="# Hello\n\n**Bold** text",
    output_path="output.docx"
)

# Or convert a file
result = converter.convert_file_to_docx(
    input_path="document.md",
    output_path="output.docx"
)

print(f"Success: {result['success']}")
print(f"Output: {result['output_path']}")
```

### Option 3: CLI (Original)
```bash
python doc_combiner.py "path/to/file.md" -o "output.docx"
```

## Installation

```bash
pip install -r requirements.txt
python -m playwright install
```

Optional (for faster Mermaid rendering):
```bash
npm install -g @mermaid-js/mermaid-cli
```

## Architecture

- **doc_converter_api.py** - Core conversion API (new)
- **web_ui.py** - Flask web interface (new)
- **doc_combiner.py** - Original CLI tool
- **templates/index.html** - Web UI (new)

## Usage Examples

### Web UI
1. **Paste Mode**: Copy markdown, click Convert
2. **Upload Mode**: Choose .md/.txt file
3. **Path Mode**: Enter file or folder path

### API Examples
```python
# Convert multiple files
converter.convert_multiple_files_to_docx(
    file_paths=["doc1.md", "doc2.md"],
    output_path="combined.docx"
)

# Disable run folder (output directly)
converter.convert_content_to_docx(
    content="# Test",
    output_path="test.docx",
    create_run_folder=False
)
```

## Outputs

All conversions create:
- **DOCX file**: Your formatted document
- **Run folder** (optional): `run_YYYYMMDD_HHMMSS_name/`
  - Output DOCX
  - `images/` - Extracted Mermaid diagrams (PNG)
  - `run_summary.txt` - Processing details

## Supported Features

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
