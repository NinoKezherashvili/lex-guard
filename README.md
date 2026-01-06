# LexyGuard

**AI Data Protection - Detect and protect sensitive data before sharing with ChatGPT and Gemini**

LexyGuard is a browser extension that automatically scans your input fields on AI chat platforms (ChatGPT, Gemini) to detect sensitive personal and financial information before you send it. It helps prevent accidental data leaks by alerting you and providing tools to mask or remove sensitive data.

## Features

- **Real-time Detection**: Automatically scans text as you type in chat input fields
- **Sensitive Data Patterns**: Detects:
  - Georgian Personal ID numbers (11 digits)
  - Georgian Company ID numbers (9 digits)
  - IBAN bank account numbers
  - Phone numbers
  - Email addresses
  - Website URLs

- **Protection Options**:
  - Visual alerts with a banner showing detected items
  - Block send button when sensitive data is detected
  - Replace sensitive data with placeholders
  - Delete sensitive data entirely
  - Mask/reveal values for review

- **User Experience**:
  - Sound alerts (optional)
  - Shake animation on input fields
  - Bilingual support (English/Georgian)
  - Severity-based categorization (High/Medium)

## Installation

1. Clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this directory
5. The extension will automatically activate on ChatGPT and Gemini pages

## Usage

Once installed, LexyGuard works automatically. When you type sensitive information in chat input fields:

1. A banner appears showing detected sensitive data
2. Click "Details" to see all detected items
3. Use "Replace All" or individual item replace buttons to mask or remove data
4. Review items before sending your message

## Configuration

Click the extension icon to access settings:
- Toggle sound alerts
- Toggle shake animation
- Switch language (English/Georgian)
- Configure API key (if applicable)

## Supported Platforms

- ChatGPT (chat.openai.com, chatgpt.com)
- Google Gemini (gemini.google.com)
