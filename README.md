# Jira Ticket Creator Chrome Extension

A Chrome extension that allows you to select text from any webpage, analyze it using ChatGPT, and automatically create a Jira ticket with the analyzed information.

## Features

- 🎯 **Text Selection**: Select any text on a webpage and capture it for analysis
- 🤖 **AI Analysis**: Use ChatGPT to analyze the selected text and generate structured ticket information
- 🎫 **Jira Integration**: Automatically create Jira tickets with proper formatting
- ⚙️ **Configurable**: Set up your OpenAI and Jira credentials
- 🎨 **Modern UI**: Beautiful, responsive interface with visual feedback
- ⌨️ **Keyboard Shortcuts**: Use Ctrl+Shift+J to quickly create tickets
- 🖱️ **Context Menu**: Right-click on selected text to create tickets
- 🔒 **Secure**: All API keys are stored locally in Chrome's secure storage

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Download or clone this repository**
   ```bash
   git clone <repository-url>
   cd mountaineers-jira-from-chrome
   ```

2. **Open Chrome Extensions page**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the extension folder
   - The extension should now appear in your extensions list

4. **Pin the extension** (optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Pin the "Jira Ticket Creator" extension

### Method 2: Create Extension Package (For Distribution)

1. **Package the extension**
   - Go to `chrome://extensions/`
   - Click "Pack extension"
   - Select the extension folder
   - Chrome will create a `.crx` file

2. **Install the package**
   - Drag the `.crx` file to the Chrome extensions page
   - Confirm installation

## Setup

### 1. OpenAI API Key

1. **Get an OpenAI API key**
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Add to extension**
   - Click the extension icon
   - Paste your API key in the "OpenAI API Key" field
   - Click "Save Configuration"

### 2. Jira Configuration

1. **Get Jira API Token**
   - Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Click "Create API token"
   - Give it a name (e.g., "Chrome Extension")
   - Copy the token

2. **Configure Jira settings**
   - **Jira Domain**: Your Jira instance URL (e.g., `yourcompany.atlassian.net`)
   - **Jira Email**: Your Jira account email
   - **Jira API Token**: The token you just created
   - **Project Key**: The key of your Jira project (e.g., `PROJ`)
   - **Issue Type**: Default issue type (Task, Bug, Story, Epic)

3. **Save configuration**
   - Click "Save Configuration" in the extension popup

## Usage

### Method 1: Using the Extension Popup

1. **Select text** on any webpage
2. **Click the extension icon** in the Chrome toolbar
3. **Click "Get Selected Text"** to capture the selection
4. **Click "Analyze with ChatGPT"** to generate ticket information
5. **Review the preview** of the generated ticket
6. **Click "Create Jira Ticket"** to create the ticket in Jira

### Method 2: Keyboard Shortcut

1. **Select text** on any webpage
2. **Press Ctrl+Shift+J** (or Cmd+Shift+J on Mac)
3. The extension popup will open with the selected text
4. Follow steps 4-6 from Method 1

### Method 3: Context Menu

1. **Select text** on any webpage
2. **Right-click** on the selection
3. **Choose "Create Jira Ticket from Selection"**
4. Follow steps 4-6 from Method 1

### Method 4: Floating Button

1. **Select text** on any webpage
2. A floating "🎫 Create Jira Ticket" button will appear
3. **Click the button** to open the extension popup
4. Follow steps 4-6 from Method 1

## How It Works

1. **Text Capture**: The content script captures selected text from any webpage
2. **AI Analysis**: ChatGPT analyzes the text and generates:
   - A clear, concise title
   - Detailed description
   - Priority level
   - Relevant labels
   - Acceptance criteria (if applicable)
3. **Ticket Creation**: The extension creates a Jira ticket using the Jira REST API
4. **Confirmation**: You get a link to the created ticket

## Configuration Options

### OpenAI Settings
- **API Key**: Your OpenAI API key for ChatGPT access
- **Model**: Uses GPT-3.5-turbo by default (configurable in code)

### Jira Settings
- **Domain**: Your Jira instance URL
- **Email**: Your Jira account email
- **API Token**: Your Jira API token
- **Project Key**: Target Jira project
- **Issue Type**: Default issue type for new tickets

## Troubleshooting

### Common Issues

1. **"No text selected" error**
   - Make sure you've selected text on the webpage
   - Try refreshing the page and selecting text again

2. **OpenAI API errors**
   - Verify your API key is correct
   - Check if you have sufficient API credits
   - Ensure your API key has the necessary permissions

3. **Jira API errors**
   - Verify your Jira domain, email, and API token
   - Check if your Jira project key exists
   - Ensure your account has permission to create issues in the project

4. **Extension not working**
   - Refresh the webpage
   - Check if the extension is enabled in `chrome://extensions/`
   - Try reloading the extension

### Debug Mode

1. **Open Chrome DevTools**
   - Right-click on the extension icon
   - Select "Inspect popup"

2. **Check console logs**
   - Look for error messages in the console
   - Check the Network tab for API call failures

3. **Check background script**
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page" for the extension

## Security & Privacy

- **API Keys**: Stored securely in Chrome's sync storage
- **Data**: Selected text is only sent to OpenAI for analysis
- **No Tracking**: The extension doesn't collect or track user data
- **Local Processing**: All configuration is stored locally

## Development

### Project Structure

```
mountaineers-jira-from-chrome/
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── content.js            # Content script for text selection
├── background.js         # Background script for API calls
├── icons/                # Extension icons
└── README.md            # This file
```

### Building from Source

1. **Clone the repository**
2. **Make changes** to the source files
3. **Load as unpacked extension** in Chrome
4. **Test your changes**
5. **Package for distribution** if needed

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the Chrome extension documentation
3. Check the OpenAI API documentation
4. Check the Jira REST API documentation
5. Open an issue in the repository

## Changelog

### Version 1.0.0
- Initial release
- Text selection and capture
- ChatGPT integration for text analysis
- Jira ticket creation
- Modern UI with visual feedback
- Multiple interaction methods (popup, keyboard shortcut, context menu, floating button)
- Secure configuration storage
- Comprehensive error handling

## Acknowledgments

- OpenAI for the ChatGPT API
- Atlassian for the Jira REST API
- Chrome Extensions team for the extension platform
