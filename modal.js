// Modal script for handling UI interactions and communication with background script

// Global flag to prevent duplicate ticket creation
let isCreatingTicket = false;
let lastCreateTicketTime = 0;

// Debug: Track modal instances
let modalInstanceId = Math.random().toString(36).substr(2, 9);

document.addEventListener('DOMContentLoaded', async () => {
    
    try {
        // Load saved configuration
        await loadConfiguration();
        
        // Load selected text from storage
        await loadSelectedText();
        
        // Set up event listeners
        setupEventListeners();
        
        // Automatically analyze text if we have selected text
        if (window.currentSelectedText) {
            await autoAnalyzeText();
        }
        
        console.log('Modal script initialization complete');
    } catch (error) {
        console.error('Error during modal initialization:', error);
        showStatus('Error initializing modal', 'error');
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
        
        // Store configuration in window object for later use
        window.config = config;
        
        // Validate that we have the required configuration
        if (!config.openaiApiKey) {
            console.warn('OpenAI API key not found in configuration');
            showStatus('OpenAI API key not configured. Please configure it in the extension popup.', 'error');
        }
        
        if (!config.jiraDomain || !config.jiraEmail || !config.jiraApiToken || !config.jiraProject) {
            console.warn('Jira configuration incomplete');
            showStatus('Jira configuration incomplete. Please configure it in the extension popup.', 'error');
        }
        
        console.log('Configuration loaded successfully');
    } catch (error) {
        console.error('Error loading configuration:', error);
        showStatus('Error loading configuration: ' + error.message, 'error');
    }
}

// Load selected text from storage
async function loadSelectedText() {
    try {
        const data = await chrome.storage.local.get(['selectedText', 'selectedUrl', 'selectedTitle']);
        
        if (data.selectedText) {
            displaySelectedText(data.selectedText, data.selectedUrl, data.selectedTitle);
            console.log('Selected text loaded:', data.selectedText);
        } else {
            console.log('No selected text found');
        }
    } catch (error) {
        console.error('Error loading selected text:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners for modal instance:', modalInstanceId);
    
    // Close modal buttons
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('closeModalSuccess').addEventListener('click', closeModal);
    
    // Create ticket button
    const createBtn = document.getElementById('createTicket');
    if (createBtn) {
        console.log('Adding click listener to create button for instance:', modalInstanceId);
        createBtn.addEventListener('click', createTicket);
    } else {
        console.error('Create ticket button not found for instance:', modalInstanceId);
    }
    
    // Re-analyze text button
    document.getElementById('reanalyzeText').addEventListener('click', reanalyzeText);
    
    // Create another ticket button
    document.getElementById('createAnother').addEventListener('click', createAnotherTicket);
    
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target === document.body) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    console.log('All event listeners set up');
}

// Automatically analyze text with ChatGPT
async function autoAnalyzeText() {
    if (!window.currentSelectedText) {
        showStatus('No text selected', 'error');
        return;
    }
    
    if (!window.config || !window.config.openaiApiKey) {
        showStatus('OpenAI API key is required. Please configure it in the extension popup first.', 'error');
        return;
    }
    
    try {
        // Show loading screen
        document.getElementById('loadingScreen').classList.remove('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        
        showStatus('Analyzing text with ChatGPT...', 'info');
        
        const response = await chrome.runtime.sendMessage({
            action: 'analyzeWithChatGPT',
            text: window.currentSelectedText,
            apiKey: window.config.openaiApiKey
        });
        
        if (response.success) {
            window.analyzedTicketData = response.result;
            populateFormFields(response.result);
            showStatus('Text analyzed successfully!', 'success');
            
            // Show main content
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Error analyzing text:', error);
        showStatus(`Error: ${error.message}`, 'error');
        
        // Show main content even on error
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
    }
}

// Populate form fields with analyzed data
function populateFormFields(ticketData) {
    document.getElementById('ticketTitle').value = ticketData.title || '';
    document.getElementById('ticketDescription').value = ticketData.description || '';
    document.getElementById('ticketPriority').value = ticketData.priority || 'Medium';
    document.getElementById('ticketLabels').value = ticketData.labels ? ticketData.labels.join(', ') : '';
    
    if (ticketData.acceptanceCriteria && ticketData.acceptanceCriteria.length > 0) {
        document.getElementById('ticketAcceptanceCriteria').value = ticketData.acceptanceCriteria.join('\n');
    }
}

// Display selected text in the UI
function displaySelectedText(text, url, title) {
    const selectedTextDiv = document.getElementById('selectedText');
    selectedTextDiv.textContent = text;
    
    // Store the text for later use
    window.currentSelectedText = text;
    window.currentSelectedUrl = url;
    window.currentSelectedTitle = title;
    
    // Show source information
    if (url && title) {
        const sourceInfo = document.createElement('div');
        sourceInfo.style.cssText = 'font-size: 12px; color: #666; margin-top: 8px;';
        sourceInfo.innerHTML = `Source: <a href="${url}" target="_blank" style="color: #667eea;">${title}</a>`;
        selectedTextDiv.appendChild(sourceInfo);
    }
}

// Re-analyze text
async function reanalyzeText() {
    await autoAnalyzeText();
}

// Create Jira ticket
async function createTicket() {
    const currentTime = Date.now();
    console.log('Create ticket clicked for modal instance:', modalInstanceId);
    console.log('Time since last click:', currentTime - lastCreateTicketTime, 'ms');
    console.log('Stack trace:', new Error().stack);
    
    // Debounce: prevent rapid successive clicks (within 2 seconds)
    if (currentTime - lastCreateTicketTime < 2000) {
        console.log('Debounce: Click too soon after last click, ignoring');
        return;
    }
    lastCreateTicketTime = currentTime;
    
    // Prevent duplicate ticket creation
    if (isCreatingTicket) {
        console.log('Ticket creation already in progress for instance', modalInstanceId, ', skipping duplicate');
        return;
    }
    isCreatingTicket = true;
    console.log('Starting ticket creation for instance:', modalInstanceId);
    
    if (!window.config) {
        showStatus('Configuration not loaded. Please configure the extension first.', 'error');
        isCreatingTicket = false; // Reset flag on early return
        return;
    }
    
    const config = {
        jiraDomain: window.config.jiraDomain || '',
        jiraEmail: window.config.jiraEmail || '',
        jiraApiToken: window.config.jiraApiToken || '',
        jiraProject: window.config.jiraProject || '',
        issueType: window.config.issueType || 'Task'
    };
    
    // Validate configuration
    if (!config.jiraDomain || !config.jiraEmail || !config.jiraApiToken || !config.jiraProject) {
        showStatus('Jira configuration is incomplete. Please configure it in the extension popup first.', 'error');
        isCreatingTicket = false; // Reset flag on early return
        return;
    }
    
    // Get data from form fields
    const ticketData = {
        title: document.getElementById('ticketTitle').value.trim(),
        description: document.getElementById('ticketDescription').value.trim(),
        priority: document.getElementById('ticketPriority').value,
        labels: document.getElementById('ticketLabels').value.split(',').map(l => l.trim()).filter(l => l.length > 0),
        acceptanceCriteria: document.getElementById('ticketAcceptanceCriteria').value.split('\n').map(c => c.trim()).filter(c => c.length > 0)
    };
    
    if (!ticketData.title) {
        showStatus('Please enter a ticket title', 'error');
        isCreatingTicket = false; // Reset flag on early return
        return;
    }
    
    if (!ticketData.description) {
        showStatus('Please enter a ticket description', 'error');
        isCreatingTicket = false; // Reset flag on early return
        return;
    }
    
    const createBtn = document.getElementById('createTicket');
    const originalText = createBtn.textContent;
    
    try {
        // Show loading state
        createBtn.innerHTML = '<span class="loading"></span>Creating...';
        createBtn.disabled = true;
        
        showStatus('Creating Jira ticket...', 'info');
        
        const response = await chrome.runtime.sendMessage({
            action: 'createJiraTicket',
            ticketData: ticketData,
            config: config
        });
        
        if (response.success) {
            showSuccessScreen(response.result);
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        // Restore button state and reset flag
        createBtn.textContent = originalText;
        createBtn.disabled = false;
        isCreatingTicket = false; // Reset flag after completion
        console.log('Ticket creation completed, flag reset');
    }
}

// Show success screen
function showSuccessScreen(result) {
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('successScreen').classList.remove('hidden');
    
    const ticketLink = document.getElementById('ticketLink');
    ticketLink.href = result.issueUrl;
    ticketLink.textContent = `View ${result.issueKey}`;
    
    showStatus('Ticket created successfully!', 'success');
}

// Close modal
function closeModal() {
    window.close();
}

// Create another ticket
function createAnotherTicket() {
    // Reset form
    document.getElementById('ticketTitle').value = '';
    document.getElementById('ticketDescription').value = '';
    document.getElementById('ticketPriority').value = 'Medium';
    document.getElementById('ticketLabels').value = '';
    document.getElementById('ticketAcceptanceCriteria').value = '';
    
    // Show main content
    document.getElementById('successScreen').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    
    // Re-analyze if we have selected text
    if (window.currentSelectedText) {
        autoAnalyzeText();
    }
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
}