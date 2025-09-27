function testModal() {
    const status = document.getElementById('status');
    try {
        // Test if we can access the modal URL
        const modalUrl = chrome.runtime.getURL('modal.html');
        status.innerHTML = `<div class="success">Modal URL accessible: ${modalUrl}</div>`;
        
        // Try to create an iframe
        const iframe = document.createElement('iframe');
        iframe.src = modalUrl;
        iframe.style.cssText = 'width: 100%; height: 400px; border: 1px solid #ccc; margin: 10px 0;';
        iframe.onload = () => {
            status.innerHTML += `<div class="success">Modal iframe loaded successfully!</div>`;
        };
        iframe.onerror = () => {
            status.innerHTML += `<div class="error">Modal iframe failed to load!</div>`;
        };
        
        document.body.appendChild(iframe);
        
    } catch (error) {
        status.innerHTML = `<div class="error">Error testing modal: ${error.message}</div>`;
    }
}

function testStorage() {
    const status = document.getElementById('status');
    try {
        chrome.storage.local.set({test: 'value'}).then(() => {
            chrome.storage.local.get(['test']).then((result) => {
                if (result.test === 'value') {
                    status.innerHTML = `<div class="success">Storage working correctly!</div>`;
                } else {
                    status.innerHTML = `<div class="error">Storage test failed!</div>`;
                }
            });
        });
    } catch (error) {
        status.innerHTML = `<div class="error">Storage error: ${error.message}</div>`;
    }
}

function testBackgroundScript() {
    const status = document.getElementById('status');
    try {
        chrome.runtime.sendMessage({action: 'ping'}, (response) => {
            if (response && response.success) {
                status.innerHTML = `<div class="success">Background script responding: ${response.message}</div>`;
            } else {
                status.innerHTML = `<div class="error">Background script not responding</div>`;
            }
        });
    } catch (error) {
        status.innerHTML = `<div class="error">Background script error: ${error.message}</div>`;
    }
}

// Add some sample text for selection
document.addEventListener('DOMContentLoaded', () => {
    console.log('Test page loaded');
    
    // Add event listeners for test buttons
    document.getElementById('testModalBtn').addEventListener('click', testModal);
    document.getElementById('testStorageBtn').addEventListener('click', testStorage);
    document.getElementById('testBackgroundBtn').addEventListener('click', testBackgroundScript);
});
