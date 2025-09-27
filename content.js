// Content script to capture selected text from the current page
(function() {
    'use strict';

    let selectedText = '';
    let selectedTextCache = '';

    // Function to get the currently selected text
    function getSelectedText() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const text = range.toString().trim();
            return text;
        }
        return '';
    }

    // Function to highlight selected text (optional visual feedback)
    function highlightSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
            span.style.border = '1px solid #ffeb3b';
            span.style.borderRadius = '2px';
            
            try {
                range.surroundContents(span);
                // Remove highlight after 2 seconds
                setTimeout(() => {
                    if (span.parentNode) {
                        span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
                    }
                }, 2000);
            } catch (e) {
                // If surrounding fails, just log the selection
                console.log('Text selected for Jira ticket creation:', range.toString());
            }
        }
    }

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getSelectedText') {
            selectedText = getSelectedText();
            
            if (selectedText) {
                // Provide visual feedback
                highlightSelection();
                sendResponse({
                    success: true,
                    text: selectedText,
                    url: window.location.href,
                    title: document.title
                });
            } else {
                sendResponse({
                    success: false,
                    message: 'No text selected. Please select some text on the page first.'
                });
            }
        }
        
        if (request.action === 'closeModal') {
            // Remove modal if it exists
            const existingModal = document.getElementById('jira-ticket-modal');
            if (existingModal) {
                existingModal.remove();
            }
        }
    });

    // Add keyboard shortcut listener (Ctrl+Shift+J)
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'J') {
            event.preventDefault();
            console.log('Keyboard shortcut triggered');
            selectedText = getSelectedText();
            console.log('Selected text from keyboard:', selectedText);
            
            if (selectedText) {
                console.log('Calling showModal from keyboard shortcut');
                showModal(selectedText);
            } else {
                // Show notification if no text is selected
                console.log('No text selected for keyboard shortcut');
                showNotification('Please select some text first, then use Ctrl+Shift+J');
            }
        }
    });

    // Function to show a temporary notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

// Global flag to prevent button recreation during click
let isButtonBeingClicked = false;
let lastMouseDownTarget = null;
let isModalOpen = false;
let isOpeningModal = false;

// Add visual indicator when text is selected
document.addEventListener('mouseup', (e) => {
    // Check if the mousedown was on the button
    if (lastMouseDownTarget && lastMouseDownTarget.id === 'jira-selection-button') {
        lastMouseDownTarget = null;
        return;
    }
    
    // Check if we're clicking on the button or if button is being clicked
    const existingButton = document.getElementById('jira-selection-button');
    if (existingButton && (existingButton.dataset.clicking === 'true' || e.target === existingButton || isButtonBeingClicked)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
    }
    
    // Delay button creation to allow click events to fire first
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        // Cache selection for later click (selection often collapses on click)
        selectedTextCache = selectedText;

        if (selectedText.length > 0) {
            // Show a small floating button
            showSelectionButton();
        }
    }, 100); // 100ms delay
}, true); // Use capture phase

// Track mousedown target
document.addEventListener('mousedown', (e) => {
    lastMouseDownTarget = e.target;
}, true);

    function showSelectionButton() {
        // Don't show button if modal is already open
        if (isModalOpen) {
            console.log('Modal is already open, not showing button');
            return;
        }
        
        // Check if existing button is being clicked
        const existingButton = document.getElementById('jira-selection-button');
        if (existingButton && (existingButton.dataset.clicking === 'true' || isButtonBeingClicked)) {
            return;
        }
        
        // Remove existing button if any
        if (existingButton) {
            existingButton.remove();
        }

        const button = document.createElement('div');
        button.id = 'jira-selection-button';
        button.innerHTML = '🎫 Create Jira Ticket';
        button.style.cssText = `
            position: fixed !important;
            background: #667eea !important;
            color: white !important;
            padding: 8px 12px !important;
            border-radius: 20px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            z-index: 2147483647 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
            transition: all 0.2s ease !important;
            user-select: none !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            border: 2px solid #5a6fd8 !important;
        `;

        // Position the button near the selection
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Calculate position with better logic
            let left = rect.left + window.scrollX;
            let top = rect.bottom + window.scrollY + 10;
            
            // Ensure button is within viewport
            const buttonWidth = 150; // Approximate button width
            const buttonHeight = 30; // Approximate button height
            
            if (left + buttonWidth > window.innerWidth) {
                left = window.innerWidth - buttonWidth - 10;
            }
            if (left < 0) {
                left = 10;
            }
            
            if (top + buttonHeight > window.innerHeight + window.scrollY) {
                top = rect.top + window.scrollY - buttonHeight - 10;
            }
            if (top < window.scrollY) {
                top = window.scrollY + 10;
            }
            
            button.style.left = left + 'px';
            button.style.top = top + 'px';
        } else {
            // Fallback position
            button.style.left = '50%';
            button.style.top = '50%';
            button.style.transform = 'translate(-50%, -50%)';
        }

        // Helper to reliably open the modal exactly once, using cached selection
        function openModalOnce() {
            if (button.dataset.clicked === 'true' || isModalOpen || isOpeningModal) {
                console.log('Modal already opened, modal is open, or opening in progress, skipping duplicate');
                return;
            }
            button.dataset.clicked = 'true';
            isModalOpen = true;
            isOpeningModal = true;
            console.log('Opening modal for button:', button.id);

            // Prefer cached selection captured on mouseup
            let text = (selectedTextCache && selectedTextCache.trim()) ? selectedTextCache.trim() : '';
            if (!text) {
                // Fallback to current window selection as a last resort
                text = window.getSelection().toString().trim();
            }
            try {
                if (text) {
                    showModal(text);
                }
            } catch (err) {
                console.error('Error calling showModal:', err);
            }
            if (button.parentNode) {
                button.remove();
            }
        }

        button.addEventListener('mousedown', (e) => {
            button.dataset.clicking = 'true'; // Mark as being clicked
            isButtonBeingClicked = true; // Set global flag
            // Prevent selection from collapsing before we read it
            e.preventDefault();
            e.stopPropagation();
            // Open immediately on mousedown so the cached selection is still valid
            openModalOnce();
            // Clear the flag after a short delay in case click doesn't fire
            setTimeout(() => {
                if (button.dataset.clicking === 'true') {
                    button.dataset.clicking = 'false';
                    isButtonBeingClicked = false;
                }
            }, 1000);
        });

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            button.dataset.clicking = 'false';
            isButtonBeingClicked = false;
            openModalOnce();
        });

        // Also add a touch event for mobile
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModalOnce();
        });

        // Add mouseup as backup click detection
        button.addEventListener('mouseup', (e) => {
            if (e.button === 0 && !e.defaultPrevented && button.dataset.clicked !== 'true') {
                e.preventDefault();
                e.stopPropagation();
                openModalOnce();
            }
        });

        button.addEventListener('mouseenter', () => {
            button.style.background = '#5a6fd8';
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#667eea';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        });

        document.body.appendChild(button);
        
        // Add a temporary highlight to make button more visible
        button.style.animation = 'pulse 1s ease-in-out 3';
        
        // Add CSS animation
        if (!document.getElementById('jira-button-styles')) {
            const style = document.createElement('style');
            style.id = 'jira-button-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Test if button is actually visible and clickable
        setTimeout(() => {
            const rect = button.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(button);
            const visible = rect.width > 0 && rect.height > 0;
            const inViewport = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        }, 100);

        // Remove button after 15 seconds or when selection changes
        setTimeout(() => {
            if (button.parentNode) {
                button.remove();
            }
        }, 15000);

        // Remove button when selection changes
        document.addEventListener('selectionchange', () => {
            const isClicking = (button.dataset.clicking === 'true') || isButtonBeingClicked;
            const hasSelection = window.getSelection().toString().trim().length > 0;
            if (button.parentNode && !isClicking && !hasSelection) {
                button.remove();
            }
        });
    }

    // Function to show the modal
    function showModal(selectedText) {
        try {
            // Remove existing modal if any
            const existingModal = document.getElementById('jira-ticket-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create modal iframe
            const modal = document.createElement('div');
            modal.id = 'jira-ticket-modal';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 2147483647 !important;
                background: rgba(0, 0, 0, 0.5) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;

            const iframe = document.createElement('iframe');
            const modalUrl = chrome.runtime.getURL('modal.html');

            iframe.src = modalUrl;
            iframe.style.cssText = `
                width: 90% !important;
                max-width: 800px !important;
                height: 90vh !important;
                border: none !important;
                border-radius: 12px !important;
                background: white !important;
            `;

            // Add iframe load event listeners
            iframe.onload = () => {
                console.log('Iframe onload event fired');
                // Modal loaded successfully - give it more time to render
                setTimeout(() => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (!iframeDoc || iframeDoc.body.children.length === 0) {
                            console.log('Iframe loaded but has no content');
                            // Iframe loaded but has no content, use fallback
                            //fallbackToInline();
                        } else {
                            console.log('Iframe loaded successfully with content');
                            iframeLoadedSuccessfully = true;
                        }
                    } catch (e) {
                        console.log('Cannot access iframe content due to CSP, but that\'s normal');
                        // Can't access iframe content due to CSP, but that's normal
                        // Don't fall back immediately - let the timeout handle it
                    }
                }, 2000); // Increased timeout to 2 seconds
            };
            
            // Fallback function for when iframe fails to load
            let fallbackUsed = false;
            let iframeLoadedSuccessfully = false;
            const fallbackToInline = () => {
                if (fallbackUsed) {
                    console.log('Fallback already used, skipping');
                    return;
                }
                fallbackUsed = true;
                console.log('Using fallback modal due to iframe failure');
                
                // Clear iframe and use inline content inside the same modal container
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);

                const container = document.createElement('div');
                container.style.cssText = `
                    width: 90% !important;
                    max-width: 800px !important;
                    height: 90vh !important;
                    border-radius: 12px !important;
                    background: white !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,.3) !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                `;
                container.innerHTML = `
                    <div style="padding:12px 16px; border-bottom:1px solid #eee; font:500 16px system-ui; display:flex; justify-content:space-between; align-items:center;">
                        <span>🎫 Create Jira Ticket</span>
                        <button id="jira-inline-close" style="background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:16px; flex:1; overflow:auto;">
                        <div style="margin-bottom:16px;">
                            <label style="font:14px system-ui; display:block; margin-bottom:8px; font-weight:500;">Selected Text</label>
                            <textarea id="selected-text-display" style="width:100%; height:80px; font:13px/1.45 system-ui; border:1px solid #ddd; border-radius:4px; padding:8px;" readonly>${selectedText}</textarea>
                        </div>
                        
                        <div style="margin-bottom:16px;">
                            <label style="font:14px system-ui; display:block; margin-bottom:8px; font-weight:500;">Title</label>
                            <input type="text" id="ticket-title" style="width:100%; font:13px system-ui; border:1px solid #ddd; border-radius:4px; padding:8px;" placeholder="Enter ticket title">
                        </div>
                        
                        <div style="margin-bottom:16px;">
                            <label style="font:14px system-ui; display:block; margin-bottom:8px; font-weight:500;">Description</label>
                            <textarea id="ticket-description" style="width:100%; height:100px; font:13px/1.45 system-ui; border:1px solid #ddd; border-radius:4px; padding:8px;" placeholder="Enter ticket description"></textarea>
                        </div>
                        
                        <div style="display:flex; gap:16px; margin-bottom:16px;">
                            <div style="flex:1;">
                                <label style="font:14px system-ui; display:block; margin-bottom:8px; font-weight:500;">Priority</label>
                                <select id="ticket-priority" style="width:100%; font:13px system-ui; border:1px solid #ddd; border-radius:4px; padding:8px;">
                                    <option value="Low">Low</option>
                                    <option value="Medium" selected>Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="font:14px system-ui; display:block; margin-bottom:8px; font-weight:500;">Labels</label>
                                <input type="text" id="ticket-labels" style="width:100%; font:13px system-ui; border:1px solid #ddd; border-radius:4px; padding:8px;" placeholder="label1, label2">
                            </div>
                        </div>
                        
                        <div style="margin-bottom:16px;">
                            <label style="font:14px system-ui; display:block; margin-bottom:8px; font-weight:500;">Acceptance Criteria</label>
                            <textarea id="ticket-criteria" style="width:100%; height:80px; font:13px/1.45 system-ui; border:1px solid #ddd; border-radius:4px; padding:8px;" placeholder="Enter acceptance criteria, one per line"></textarea>
                        </div>
                        
                        <div style="font:12px system-ui; color:#666; margin-top:12px;">
                            <div>URL: ${window.location.href}</div>
                            <div>Title: ${document.title}</div>
                        </div>
                    </div>
                    <div style="padding:12px 16px; border-top:1px solid #eee; display:flex; gap:8px; justify-content:flex-end;">
                        <button id="jira-inline-analyze" style="background:#667eea; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">🤖 Analyze with ChatGPT</button>
                        <button id="jira-inline-create" style="background:#28a745; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">🎫 Create Ticket</button>
                    </div>
                `;
                modal.appendChild(container);
                
                // Add event listeners
                const closeBtn = container.querySelector('#jira-inline-close');
                if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
                
                const analyzeBtn = container.querySelector('#jira-inline-analyze');
                if (analyzeBtn) {
                    analyzeBtn.addEventListener('click', async () => {
                        analyzeBtn.textContent = '🤖 Analyzing...';
                        analyzeBtn.disabled = true;
                        
                        try {
                            // Get configuration from storage
                            const config = await chrome.storage.sync.get(['openaiApiKey']);
                            if (!config.openaiApiKey) {
                                alert('Please configure OpenAI API key in extension settings');
                                return;
                            }
                            
                            // Call ChatGPT analysis
                            const response = await chrome.runtime.sendMessage({
                                action: 'analyzeWithChatGPT',
                                text: selectedText,
                                apiKey: config.openaiApiKey
                            });
                            
                            if (response.success) {
                                // Populate form fields
                                document.getElementById('ticket-title').value = response.result.title || '';
                                document.getElementById('ticket-description').value = response.result.description || '';
                                document.getElementById('ticket-priority').value = response.result.priority || 'Medium';
                                document.getElementById('ticket-labels').value = response.result.labels ? response.result.labels.join(', ') : '';
                                document.getElementById('ticket-criteria').value = response.result.acceptanceCriteria ? response.result.acceptanceCriteria.join('\n') : '';
                            } else {
                                alert('Analysis failed: ' + response.error);
                            }
                        } catch (error) {
                            alert('Error analyzing text: ' + error.message);
                        } finally {
                            analyzeBtn.textContent = '🤖 Analyze with ChatGPT';
                            analyzeBtn.disabled = false;
                        }
                    });
                }
                
                const createBtn = container.querySelector('#jira-inline-create');
                if (createBtn) {
                    createBtn.addEventListener('click', async () => {
                        createBtn.textContent = '🎫 Creating...';
                        createBtn.disabled = true;
                        
                        try {
                            // Get configuration
                            const config = await chrome.storage.sync.get(['jiraDomain', 'jiraEmail', 'jiraApiToken', 'jiraProject', 'issueType']);
                            
                            // Get form data
                            const ticketData = {
                                title: document.getElementById('ticket-title').value.trim(),
                                description: document.getElementById('ticket-description').value.trim(),
                                priority: document.getElementById('ticket-priority').value,
                                labels: document.getElementById('ticket-labels').value.split(',').map(l => l.trim()).filter(l => l.length > 0),
                                acceptanceCriteria: document.getElementById('ticket-criteria').value.split('\n').map(c => c.trim()).filter(c => c.length > 0)
                            };
                            
                            if (!ticketData.title || !ticketData.description) {
                                alert('Please fill in title and description');
                                return;
                            }
                            
                            // Create ticket
                            const response = await chrome.runtime.sendMessage({
                                action: 'createJiraTicket',
                                ticketData: ticketData,
                                config: config
                            });
                            
                            if (response.success) {
                                alert(`Ticket created successfully! ${response.result.issueKey}`);
                                closeModal();
                            } else {
                                alert('Failed to create ticket: ' + response.error);
                            }
                        } catch (error) {
                            alert('Error creating ticket: ' + error.message);
                        } finally {
                            createBtn.textContent = '🎫 Create Ticket';
                            createBtn.disabled = false;
                        }
                    });
                }
            };

            iframe.onerror = (error) => {
                console.log('Iframe error:', error);
                //fallbackToInline();
            };

            // Also time out in case onerror doesn't fire (some CSPs just block silently)
            setTimeout(() => {
                console.log('Iframe timeout check - checking if loaded');
                if (iframeLoadedSuccessfully) {
                    console.log('Iframe already loaded successfully, skipping timeout check');
                    return;
                }
                try {
                    const loaded = iframe.contentWindow && iframe.contentDocument && iframe.contentDocument.readyState !== 'uninitialized';
                    console.log('Iframe loaded state:', loaded);
                    if (!loaded && modal.parentNode) {
                        console.log('Iframe not loaded, using fallback');
                        //fallbackToInline();
                    }
                } catch (e) {
                    console.log('Cannot check iframe state due to CSP:', e);
                    // Can't check iframe state due to CSP, assume it failed
                    if (modal.parentNode) {
                        console.log('Using fallback due to CSP restriction');
                        //fallbackToInline();
                    }
                }
            }, 5000); // Increased timeout to 5 seconds

            modal.appendChild(iframe);
            document.body.appendChild(modal);
            console.log('Modal created and appended to document body');
            isOpeningModal = false; // Reset the opening flag since modal is now created

            // Store selected text for the modal
            chrome.storage.local.set({
                selectedText: selectedText,
                selectedUrl: window.location.href,
                selectedTitle: document.title
            }).then(() => {
                // Selected text stored successfully
            }).catch((error) => {
                console.error('Error storing selected text:', error);
            });

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

            // Close modal with Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);

        } catch (error) {
            console.error('Error in showModal:', error);
            isOpeningModal = false; // Reset flag on error
        }
    }

    // Helper function to close modal and reset flags
    function closeModal() {
        const modal = document.getElementById('jira-ticket-modal');
        if (modal) {
            modal.remove();
        }
        isModalOpen = false;
        isOpeningModal = false; // Reset opening flag when modal is closed
        console.log('Modal closed, resetting flags');
    }


})();
