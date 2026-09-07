# ScholarFlow

ScholarFlow is a browser extension designed for academic research workflows, citation generation, smart screenshots, and privacy-focused page redaction.

It helps users:
- Generate citations in IEEE, APA, Harvard, MLA, and BibTeX formats
- Extract metadata from webpages and local PDFs
- Verify academic sources and publication details
- Capture visible or full-page screenshots
- Redact sensitive content directly on a webpage
- Export and manage bibliography entries locally

## Features

### Academic Citation Engine
- Supports IEEE, APA 7th, Harvard, MLA 9th, and BibTeX
- Extracts metadata from articles, webpages, and PDF documents
- Normalizes authors, dates, venues, and DOI information
- Creates bibliography and in-text citations for academic workflows

### Source Verification
- Checks source metadata against common academic lookup patterns
- Helps confirm whether the referenced work appears to be real and academic
- Useful for research validation and literature review tasks

### Privacy & Redaction
- Select elements to blur, blackout, hide, or pixelate
- Protect sensitive content before screenshots or sharing
- Restore original page content when needed

### Smart Screenshot Capture
- Capture visible page area
- Capture the full page with stitched scrolling logic
- Capture selected elements or tall tables
- Save screenshots as PNG or JPEG
- Copy to clipboard or download locally

### Screen Recording
- Record visible browser activity
- Optional audio capture
- Save the recorded result as a video file

## Supported Browsers
- Google Chrome
- Microsoft Edge
- Mozilla Firefox

## Installation

### Chrome / Edge
1. Open `chrome://extensions` or `edge://extensions`
2. Enable Developer Mode
3. Load the unpacked extension folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on`
3. Select the extension folder or manifest file

## Project Structure

```text
ScholarFlow/
├── manifest.json
├── manifest_chrome.json
├── manifest_firefox.json
├── background.js
├── content.js
├── content.css
├── sidebar.html
├── sidebar.js
├── popup.html
├── i18n.js
├── privacy.html
├── icon.png
├── icon16.png
├── icon48.png
├── icon128.png
├── .gitignore
├── LICENSE
├── README.md
└── OS/
    ├── html/
    ├── js/
    └── css/
```

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) for details.

## Support
For support, questions, or feature requests, please open an issue in this repository.

## Disclaimer
ScholarFlow is a productivity and research support tool. Users are responsible for validating academic sources before formal publication or professional use.