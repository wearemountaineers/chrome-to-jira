// Background script for handling API communications and extension lifecycle
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Jira Ticket Creator extension installed');
    
    try {
        // Check if configuration already exists
        const existingConfig = await chrome.storage.sync.get([
            'openaiApiKey',
            'jiraDomain',
            'jiraEmail',
            'jiraApiToken',
            'jiraProject',
            'issueType'
        ]);
        
        // Only set defaults if no configuration exists
        if (!existingConfig.openaiApiKey && !existingConfig.jiraDomain) {
            console.log('Setting default configuration');
            await chrome.storage.sync.set({
                openaiApiKey: '',
                jiraDomain: '',
                jiraEmail: '',
                jiraApiToken: '',
                jiraProject: '',
                issueType: 'Task'
            });
            console.log('Default configuration set');
        } else {
            console.log('Configuration already exists, skipping defaults');
        }
    } catch (error) {
        console.error('Error setting default configuration:', error);
    }
});

// Handle navigation preload to prevent the warning
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup');
});

// Handle service worker lifecycle
self.addEventListener('activate', (event) => {
    console.log('Service worker activated');
});

self.addEventListener('install', (event) => {
    console.log('Service worker installed');
    self.skipWaiting();
});

// Add a simple test handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    
    // Simple ping test
    if (request.action === 'ping') {
        console.log('Ping received, sending pong');
        sendResponse({ success: true, message: 'pong' });
        return;
    }
    
    if (request.action === 'openPopupWithText') {
        // Store the selected text for the popup to use
        chrome.storage.local.set({
            selectedText: request.text,
            selectedUrl: request.url,
            selectedTitle: request.title
        });
        
        // Open the popup
        chrome.action.openPopup();
    }
    
    if (request.action === 'analyzeWithChatGPT') {
        console.log('Handling analyzeWithChatGPT request');
        analyzeWithChatGPT(request.text, request.apiKey)
            .then(result => {
                console.log('ChatGPT analysis successful:', result);
                sendResponse({ success: true, result });
            })
            .catch(error => {
                console.log('ChatGPT analysis failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'testJiraConnection') {
        console.log('Handling testJiraConnection request with config:', request.config);
        testJiraConnection(request.config)
            .then(result => {
                console.log('Jira connection test successful:', result);
                sendResponse({ success: true, result });
            })
            .catch(error => {
                console.log('Jira connection test failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'createJiraTicket') {
        console.log('Handling createJiraTicket request');
        createJiraTicket(request.ticketData, request.config)
            .then(result => {
                console.log('Jira ticket creation successful:', result);
                sendResponse({ success: true, result });
            })
            .catch(error => {
                console.log('Jira ticket creation failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }
    
    console.log('No handler found for action:', request.action);
});

// Function to test Jira connection
async function testJiraConnection(config) {
    const { jiraDomain, jiraEmail, jiraApiToken } = config;
    
    if (!jiraDomain || !jiraEmail || !jiraApiToken) {
        throw new Error('Jira configuration is incomplete');
    }

    try {
        console.log('Testing Jira connection...');
        const response = await fetch(`https://${jiraDomain}/rest/api/3/myself`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${btoa(jiraEmail + ':' + jiraApiToken)}`
            }
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.errorMessages && errorData.errorMessages.length > 0) {
                    errorMessage = errorData.errorMessages.join(', ');
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (parseError) {
                const responseText = await response.text();
                errorMessage = `HTTP ${response.status}: ${responseText}`;
            }
            throw new Error(`Jira connection failed: ${errorMessage}`);
        }

        const userData = await response.json();
        console.log('Jira connection successful:', userData);
        return { success: true, user: userData };
    } catch (error) {
        console.error('Jira connection test failed:', error);
        throw error;
    }
}

// Function to analyze text with ChatGPT
async function analyzeWithChatGPT(text, apiKey) {
    if (!apiKey) {
        throw new Error('OpenAI API key is required');
    }

    const prompt = `Analyze the following text and create a structured Jira ticket. Please provide:
1. A clear, concise title (max 100 characters)
2. A detailed description of the issue/request
3. Suggested priority level (Low, Medium, High, Critical)
4. Suggested labels/tags (IMPORTANT: labels must not contain spaces or special characters, use underscores or camelCase)
5. Acceptance criteria if applicable

Text to analyze:
"${text}"

Please respond in JSON format with the following structure:
{
    "title": "Clear and concise title",
    "description": "Detailed description with context",
    "priority": "Medium",
    "labels": ["label1", "label2"],
    "acceptanceCriteria": ["Criteria 1", "Criteria 2"]
}

Note: Labels should be short, descriptive, and contain only letters, numbers, and underscores (no spaces).`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that creates well-structured Jira tickets from user-provided text. Always respond with valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // Try to parse the JSON response
        try {
            const parsed = JSON.parse(content);
            return parsed;
        } catch (parseError) {
            // If JSON parsing fails, create a structured response from the text
            return {
                title: content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 100),
                description: content,
                priority: 'Medium',
                labels: ['ai-generated'],
                acceptanceCriteria: []
            };
        }
    } catch (error) {
        console.error('ChatGPT analysis error:', error);
        throw error;
    }
}

// Function to create a Jira ticket
async function createJiraTicket(ticketData, config) {
    const { jiraDomain, jiraEmail, jiraApiToken, jiraProject, issueType } = config;
    
    if (!jiraDomain || !jiraEmail || !jiraApiToken || !jiraProject) {
        throw new Error('Jira configuration is incomplete');
    }

    // Create the Jira issue payload
    const issuePayload = {
        fields: {
            project: {
                key: jiraProject
            },
            summary: ticketData.title,
            description: {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: ticketData.description
                            }
                        ]
                    }
                ]
            },
            issuetype: {
                name: issueType
            }
        }
    };

    // Add priority if provided
    if (ticketData.priority) {
        const priorityMap = {
            'Low': 'Lowest',
            'Medium': 'Medium',
            'High': 'High',
            'Critical': 'Highest'
        };
        issuePayload.fields.priority = {
            name: priorityMap[ticketData.priority] || 'Medium'
        };
    }

    // Add labels if provided (sanitize to remove spaces and special characters)
    console.log('Original labels:', ticketData.labels);
    if (ticketData.labels && ticketData.labels.length > 0) {
        issuePayload.fields.labels = ticketData.labels.map(label => {
            // Replace spaces with underscores, remove other special characters, keep letters and numbers
            return label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
        }).filter(label => label.length > 0); // Remove empty labels
        
        console.log('Sanitized labels:', issuePayload.fields.labels);
    } else {
        console.log('No labels to sanitize');
    }

    // Add acceptance criteria if provided
    if (ticketData.acceptanceCriteria && ticketData.acceptanceCriteria.length > 0) {
        const criteriaText = ticketData.acceptanceCriteria
            .map(criteria => `* ${criteria}`)
            .join('\n');
        
        issuePayload.fields.description.content.push({
            type: 'paragraph',
            content: [
                {
                    type: 'text',
                    text: '\n\n**Acceptance Criteria:**\n' + criteriaText
                }
            ]
        });
    }

    try {
        console.log('Creating Jira ticket with payload:', JSON.stringify(issuePayload, null, 2));
        console.log('Final labels being sent:', issuePayload.fields.labels);
        console.log('Jira URL:', `https://${jiraDomain}/rest/api/3/issue`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`https://${jiraDomain}/rest/api/3/issue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(jiraEmail + ':' + jiraApiToken)}`
            },
            body: JSON.stringify(issuePayload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        console.log('Jira API response status:', response.status);
        console.log('Jira API response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.log('Jira API error response:', errorData);
                
                if (errorData.errorMessages && errorData.errorMessages.length > 0) {
                    errorMessage = errorData.errorMessages.join(', ');
                } else if (errorData.errors) {
                    const errorDetails = Object.entries(errorData.errors)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join(', ');
                    errorMessage = `Validation errors: ${errorDetails}`;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (parseError) {
                console.log('Could not parse error response:', parseError);
                const responseText = await response.text();
                console.log('Raw error response:', responseText);
                errorMessage = `HTTP ${response.status}: ${responseText}`;
            }
            throw new Error(`Jira API error: ${errorMessage}`);
        }

        const result = await response.json();
        console.log('Jira ticket created successfully:', result);
        return {
            issueKey: result.key,
            issueUrl: `https://${jiraDomain}/browse/${result.key}`,
            issueId: result.id
        };
    } catch (error) {
        console.error('Jira ticket creation error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.name === 'AbortError') {
            throw new Error('Jira API request timed out after 30 seconds');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Network error: Unable to connect to Jira. Check your internet connection and Jira domain.');
        } else if (error.message.includes('CORS')) {
            throw new Error('CORS error: Jira domain may not allow requests from browser extensions.');
        } else {
            throw new Error(`Jira ticket creation failed: ${error.message}`);
        }
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will open the popup automatically due to the manifest configuration
    console.log('Extension icon clicked');
});

// Context menu for right-click functionality
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'createJiraTicket',
        title: 'Create Jira Ticket from Selection',
        contexts: ['selection']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'createJiraTicket' && info.selectionText) {
        // Store the selected text
        chrome.storage.local.set({
            selectedText: info.selectionText,
            selectedUrl: tab.url,
            selectedTitle: tab.title
        });
        
        // Send message to content script to open modal
        chrome.tabs.sendMessage(tab.id, {
            action: 'openModalFromContextMenu',
            text: info.selectionText,
            url: tab.url,
            title: tab.title
        }).catch(error => {
            console.log('Could not send message to content script:', error);
            // Fallback: open popup if content script is not available
            chrome.action.openPopup();
        });
    }
});
