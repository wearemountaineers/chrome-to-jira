// Popup script for handling UI interactions and communication with background script
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded - popup script starting');
    
    try {
        // Load saved configuration
        console.log('Loading configuration...');
        await loadConfiguration();
        
        // Load any previously selected text
        console.log('Loading selected text...');
        await loadSelectedText();
        
        // Set up event listeners
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        console.log('Popup script initialization complete');
    } catch (error) {
        console.error('Error during popup initialization:', error);
    }
});

// Load configuration from storage
async function loadConfiguration() {
    try {
        console.log('Loading configuration from chrome.storage.sync...');
        const config = await chrome.storage.sync.get([
            'openaiApiKey',
            'jiraDomain',
            'jiraEmail',
            'jiraApiToken',
            'jiraProject',
            'issueType'
        ]);
        
        console.log('Retrieved config from storage:', config);
        
        // Populate form fields with saved values
        document.getElementById('openaiApiKey').value = config.openaiApiKey || '';
        document.getElementById('jiraDomain').value = config.jiraDomain || '';
        document.getElementById('jiraEmail').value = config.jiraEmail || '';
        document.getElementById('jiraApiToken').value = config.jiraApiToken || '';
        document.getElementById('jiraProject').value = config.jiraProject || '';
        document.getElementById('issueType').value = config.issueType || 'Task';
        
        console.log('Configuration loaded successfully');
        
        // Validate configuration after loading
        validateConfiguration();
        
        // Try to recover from backup if sync storage is empty
        if (!config.openaiApiKey && !config.jiraDomain) {
            console.log('Sync storage appears empty, trying to recover from backup...');
            await tryRecoverFromBackup();
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        showStatus('Error loading configuration: ' + error.message, 'error');
        
        // Try to recover from backup on error
        await tryRecoverFromBackup();
    }
}

// Try to recover configuration from backup storage
async function tryRecoverFromBackup() {
    try {
        console.log('Attempting to recover configuration from backup...');
        const backupData = await chrome.storage.local.get(['configBackup']);
        
        if (backupData.configBackup) {
            console.log('Found backup configuration:', backupData.configBackup);
            
            // Restore configuration to sync storage
            await chrome.storage.sync.set(backupData.configBackup);
            console.log('Configuration restored from backup');
            
            // Reload the configuration
            await loadConfiguration();
            
            showStatus('Configuration recovered from backup!', 'success');
        } else {
            console.log('No backup configuration found');
        }
    } catch (error) {
        console.error('Error recovering from backup:', error);
    }
}

// Load selected text from storage
async function loadSelectedText() {
    try {
        const data = await chrome.storage.local.get(['selectedText', 'selectedUrl', 'selectedTitle']);
        if (data.selectedText) {
            displaySelectedText(data.selectedText, data.selectedUrl, data.selectedTitle);
        }
    } catch (error) {
        console.error('Error loading selected text:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Get selected text button
    const getSelectedTextBtn = document.getElementById('getSelectedText');
    if (getSelectedTextBtn) {
        getSelectedTextBtn.addEventListener('click', getSelectedText);
        console.log('getSelectedText listener added');
    } else {
        console.error('getSelectedText button not found');
    }
    
    // Save configuration button
    const saveConfigBtn = document.getElementById('saveConfig');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveConfiguration);
        console.log('saveConfig listener added');
    } else {
        console.error('saveConfig button not found');
    }
    
    // Test Jira connection button
    const testJiraBtn = document.getElementById('testJiraConnection');
    if (testJiraBtn) {
        testJiraBtn.addEventListener('click', testJiraConnection);
        console.log('testJiraConnection listener added');
    } else {
        console.error('testJiraConnection button not found');
    }
    
    // Analyze text button
    const analyzeTextBtn = document.getElementById('analyzeText');
    if (analyzeTextBtn) {
        analyzeTextBtn.addEventListener('click', analyzeText);
        console.log('analyzeText listener added');
    } else {
        console.error('analyzeText button not found');
    }
    
    // Create ticket button
    const createTicketBtn = document.getElementById('createTicket');
    if (createTicketBtn) {
        createTicketBtn.addEventListener('click', createTicket);
        console.log('createTicket listener added');
    } else {
        console.error('createTicket button not found');
    }
    
    // Enable/disable buttons based on configuration
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', validateConfiguration);
    });
    
    console.log('All event listeners set up');
}

// Get selected text from the current tab
async function getSelectedText() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // First try to inject the content script if it's not already there
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        } catch (injectError) {
            console.log('Content script already injected or injection failed:', injectError);
        }
        
        // Wait a moment for the content script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
        
        if (response && response.success) {
            displaySelectedText(response.text, response.url, response.title);
            showStatus('Text selected successfully!', 'success');
        } else {
            showStatus(response?.message || 'No text selected', 'error');
        }
    } catch (error) {
        console.error('Error getting selected text:', error);
        
        // Fallback: try to get selection using a different method
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const selection = window.getSelection();
                    return {
                        text: selection.toString().trim(),
                        url: window.location.href,
                        title: document.title
                    };
                }
            });
            
            if (result && result[0] && result[0].result && result[0].result.text) {
                displaySelectedText(result[0].result.text, result[0].result.url, result[0].result.title);
                showStatus('Text selected successfully!', 'success');
            } else {
                showStatus('No text selected. Please select some text on the page first.', 'error');
            }
        } catch (fallbackError) {
            console.error('Fallback method also failed:', fallbackError);
            showStatus('Error getting selected text. Please refresh the page and try again.', 'error');
        }
    }
}

// Display selected text in the UI
function displaySelectedText(text, url, title) {
    const selectedTextDiv = document.getElementById('selectedText');
    selectedTextDiv.textContent = text;
    selectedTextDiv.classList.remove('empty');
    
    // Store the text for later use
    window.currentSelectedText = text;
    window.currentSelectedUrl = url;
    window.currentSelectedTitle = title;
    
    // Enable analyze button
    document.getElementById('analyzeText').disabled = false;
    
    // Show source information
    if (url && title) {
        const sourceInfo = document.createElement('div');
        sourceInfo.style.cssText = 'font-size: 11px; opacity: 0.7; margin-top: 8px;';
        sourceInfo.innerHTML = `Source: <a href="${url}" target="_blank" style="color: inherit;">${title}</a>`;
        selectedTextDiv.appendChild(sourceInfo);
    }
}

// Save configuration to storage
async function saveConfiguration() {
    console.log('Save configuration clicked');
    
    const config = {
        openaiApiKey: document.getElementById('openaiApiKey').value.trim(),
        jiraDomain: document.getElementById('jiraDomain').value.trim(),
        jiraEmail: document.getElementById('jiraEmail').value.trim(),
        jiraApiToken: document.getElementById('jiraApiToken').value.trim(),
        jiraProject: document.getElementById('jiraProject').value.trim(),
        issueType: document.getElementById('issueType').value
    };
    
    console.log('Config to save:', config);
    
    try {
        // Save to chrome.storage.sync (persists across extension reloads)
        await chrome.storage.sync.set(config);
        console.log('Configuration saved successfully to chrome.storage.sync');
        
        // Also save to chrome.storage.local as backup
        await chrome.storage.local.set({
            configBackup: config,
            lastSaved: new Date().toISOString()
        });
        console.log('Configuration backup saved to chrome.storage.local');
        
        showStatus('Configuration saved successfully! Settings will persist across extension reloads.', 'success');
        validateConfiguration();
    } catch (error) {
        console.error('Error saving configuration:', error);
        showStatus(`Error saving configuration: ${error.message}`, 'error');
    }
}

// Validate configuration and enable/disable buttons
function validateConfiguration() {
    const openaiKey = document.getElementById('openaiApiKey').value.trim();
    const jiraDomain = document.getElementById('jiraDomain').value.trim();
    const jiraEmail = document.getElementById('jiraEmail').value.trim();
    const jiraToken = document.getElementById('jiraApiToken').value.trim();
    const jiraProject = document.getElementById('jiraProject').value.trim();
    
    const hasOpenAI = openaiKey.length > 0;
    const hasJira = jiraDomain.length > 0 && jiraEmail.length > 0 && jiraToken.length > 0 && jiraProject.length > 0;
    
    // Enable analyze button if we have OpenAI key and selected text
    document.getElementById('analyzeText').disabled = !hasOpenAI || !window.currentSelectedText;
    
    // Enable create ticket button if we have Jira config and analyzed text
    document.getElementById('createTicket').disabled = !hasJira || !window.analyzedTicketData;
}

// Analyze text with ChatGPT
async function analyzeText() {
    if (!window.currentSelectedText) {
        showStatus('No text selected', 'error');
        return;
    }
    
    const apiKey = document.getElementById('openaiApiKey').value.trim();
    if (!apiKey) {
        showStatus('OpenAI API key is required', 'error');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzeText');
    const originalText = analyzeBtn.textContent;
    
    try {
        // Show loading state
        analyzeBtn.innerHTML = '<span class="loading"></span>Analyzing...';
        analyzeBtn.disabled = true;
        
        showStatus('Analyzing text with ChatGPT...', 'info');
        
        const response = await chrome.runtime.sendMessage({
            action: 'analyzeWithChatGPT',
            text: window.currentSelectedText,
            apiKey: apiKey
        });
        
        if (response.success) {
            window.analyzedTicketData = response.result;
            displayTicketPreview(response.result);
            showStatus('Text analyzed successfully!', 'success');
            validateConfiguration();
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Error analyzing text:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        // Restore button state
        analyzeBtn.textContent = originalText;
        analyzeBtn.disabled = false;
        validateConfiguration();
    }
}

// Display ticket preview
function displayTicketPreview(ticketData) {
    const previewDiv = document.getElementById('ticketPreview');
    const contentDiv = document.getElementById('ticketContent');
    
    contentDiv.innerHTML = `
        <p><strong>Title:</strong> ${escapeHtml(ticketData.title)}</p>
        <p><strong>Priority:</strong> ${escapeHtml(ticketData.priority)}</p>
        <p><strong>Labels:</strong> ${ticketData.labels ? ticketData.labels.map(l => escapeHtml(l)).join(', ') : 'None'}</p>
        <p><strong>Description:</strong></p>
        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; margin-top: 4px;">
            ${escapeHtml(ticketData.description).replace(/\n/g, '<br>')}
        </div>
        ${ticketData.acceptanceCriteria && ticketData.acceptanceCriteria.length > 0 ? `
            <p><strong>Acceptance Criteria:</strong></p>
            <ul style="margin: 4px 0; padding-left: 16px;">
                ${ticketData.acceptanceCriteria.map(criteria => `<li>${escapeHtml(criteria)}</li>`).join('')}
            </ul>
        ` : ''}
    `;
    
    previewDiv.classList.remove('hidden');
}

// Create Jira ticket
async function createTicket() {
    if (!window.analyzedTicketData) {
        showStatus('Please analyze the text first', 'error');
        return;
    }
    
    const config = {
        jiraDomain: document.getElementById('jiraDomain').value.trim(),
        jiraEmail: document.getElementById('jiraEmail').value.trim(),
        jiraApiToken: document.getElementById('jiraApiToken').value.trim(),
        jiraProject: document.getElementById('jiraProject').value.trim(),
        issueType: document.getElementById('issueType').value
    };
    
    const createBtn = document.getElementById('createTicket');
    const originalText = createBtn.textContent;
    
    try {
        // Show loading state
        createBtn.innerHTML = '<span class="loading"></span>Creating...';
        createBtn.disabled = true;
        
        showStatus('Creating Jira ticket...', 'info');
        
        const response = await chrome.runtime.sendMessage({
            action: 'createJiraTicket',
            ticketData: window.analyzedTicketData,
            config: config
        });
        
        if (response.success) {
            showStatus(`Ticket created successfully! <a href="${response.result.issueUrl}" target="_blank" style="color: inherit;">View: ${response.result.issueKey}</a>`, 'success');
            
            // Clear the form
            window.currentSelectedText = null;
            window.analyzedTicketData = null;
            document.getElementById('selectedText').textContent = 'No text selected. Please select text on the current page and click "Get Selected Text".';
            document.getElementById('selectedText').classList.add('empty');
            document.getElementById('ticketPreview').classList.add('hidden');
            validateConfiguration();
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        // Restore button state
        createBtn.textContent = originalText;
        createBtn.disabled = false;
        validateConfiguration();
    }
}

// Show status message
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 5000);
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Test Jira connection
async function testJiraConnection() {
    const config = {
        jiraDomain: document.getElementById('jiraDomain').value.trim(),
        jiraEmail: document.getElementById('jiraEmail').value.trim(),
        jiraApiToken: document.getElementById('jiraApiToken').value.trim()
    };
    
    const testBtn = document.getElementById('testJiraConnection');
    const originalText = testBtn.textContent;
    
    try {
        // Show loading state
        testBtn.innerHTML = '<span class="loading"></span>Testing...';
        testBtn.disabled = true;
        
        showStatus('Testing Jira connection...', 'info');
        
        // First test if background script is responding
        console.log('Testing background script connection...');
        const pingResponse = await chrome.runtime.sendMessage({ action: 'ping' });
        console.log('Ping response:', pingResponse);
        
        if (!pingResponse || !pingResponse.success) {
            throw new Error('Background script is not responding. Please reload the extension.');
        }
        
        console.log('Sending testJiraConnection message with config:', config);
        
        const response = await chrome.runtime.sendMessage({
            action: 'testJiraConnection',
            config: config
        });
        
        console.log('Received response:', response);
        
        if (!response) {
            throw new Error('No response received from background script');
        }
        
        if (response.success) {
            showStatus(`Jira connection successful! Logged in as: ${response.result.user.displayName}`, 'success');
        } else {
            throw new Error(response.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Error testing Jira connection:', error);
        showStatus(`Jira connection failed: ${error.message}`, 'error');
    } finally {
        // Restore button state
        testBtn.textContent = originalText;
        testBtn.disabled = false;
    }
}

// Initialize validation on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(validateConfiguration, 100);
});
