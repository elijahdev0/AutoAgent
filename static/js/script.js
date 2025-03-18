document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const terminalOutput = document.getElementById('terminal-output');
    const commandInput = document.getElementById('command-input');
    const sendBtn = document.getElementById('send-btn');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const modeSelect = document.getElementById('mode-select');
    const modelSelect = document.getElementById('model-select');
    const statusText = document.getElementById('status-text');
    const openrouterModelGroup = document.getElementById('openrouter-model-group');
    const saveSettingsBtn = document.getElementById('save-settings');

    // State
    let isAgentRunning = false;
    let pollingInterval = null;
    let apiKeys = {};

    // Initialize
    function init() {
        // Event listeners
        startBtn.addEventListener('click', startAgent);
        stopBtn.addEventListener('click', stopAgent);
        sendBtn.addEventListener('click', sendCommand);
        saveSettingsBtn.addEventListener('click', saveSettings);
        modelSelect.addEventListener('change', handleModelChange);
        commandInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                sendCommand();
            }
        });

        // Load saved API keys
        loadSettings();
        
        // Initial model check
        handleModelChange();

        // Focus on input when clicking anywhere in the terminal
        document.querySelector('.terminal-container').addEventListener('click', function() {
            if (!commandInput.disabled) {
                commandInput.focus();
            }
        });
    }

    // Load settings from localStorage
    function loadSettings() {
        const savedKeys = localStorage.getItem('apiKeys');
        if (savedKeys) {
            apiKeys = JSON.parse(savedKeys);
            Object.keys(apiKeys).forEach(key => {
                const input = document.getElementById(key);
                if (input) {
                    input.value = apiKeys[key];
                }
            });
        }
    }

    // Handle model selection change
    function handleModelChange() {
        const selectedModel = modelSelect.value;
        openrouterModelGroup.style.display = selectedModel === 'openrouter-custom' ? 'block' : 'none';
    }

    // Save settings to localStorage
    function saveSettings() {
        apiKeys = {
            'openai-key': document.getElementById('openai-key').value,
            'anthropic-key': document.getElementById('anthropic-key').value,
            'deepseek-key': document.getElementById('deepseek-key').value,
            'gemini-key': document.getElementById('gemini-key').value,
            'groq-key': document.getElementById('groq-key').value,
            'huggingface-key': document.getElementById('huggingface-key').value,
            'xai-key': document.getElementById('xai-key').value,
            'openrouter-key': document.getElementById('openrouter-key').value,
            'openrouter-model': document.getElementById('openrouter-model').value
        };

        localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
    }

    // Append messages to terminal
    function appendToTerminal(text, type = 'output') {
        // Create a new div for the message
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(type);
        
        // Convert ANSI color codes to HTML
        const colorizedText = convertAnsiToHtml(text);
        messageDiv.innerHTML = colorizedText;
        
        // Append the message
        terminalOutput.appendChild(messageDiv);
        
        // Scroll to the bottom
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    // Convert ANSI color codes to HTML
    function convertAnsiToHtml(text) {
        return text
            .replace(/\[0m/g, '</span>')
            .replace(/\[1;31m/g, '<span style="color: #ff5252; font-weight: bold;">')
            .replace(/\[1;32m/g, '<span style="color: #4CAF50; font-weight: bold;">')
            .replace(/\[1;33m/g, '<span style="color: #ffca28; font-weight: bold;">')
            .replace(/\[1;34m/g, '<span style="color: #2196F3; font-weight: bold;">')
            .replace(/\[1;35m/g, '<span style="color: #E040FB; font-weight: bold;">')
            .replace(/\[1;36m/g, '<span style="color: #00BCD4; font-weight: bold;">')
            .replace(/\[31m/g, '<span style="color: #ff5252;">')
            .replace(/\[32m/g, '<span style="color: #4CAF50;">')
            .replace(/\[33m/g, '<span style="color: #ffca28;">')
            .replace(/\[34m/g, '<span style="color: #2196F3;">')
            .replace(/\[35m/g, '<span style="color: #E040FB;">')
            .replace(/\[36m/g, '<span style="color: #00BCD4;">')
            .replace(/\n/g, '<br>');
    }

    // Start the agent
    function startAgent() {
        const mode = modeSelect.value;
        let model = modelSelect.value;
        
        // Handle OpenRouter custom model
        if (model === 'openrouter-custom') {
            const customModel = document.getElementById('openrouter-model').value.trim();
            if (!customModel) {
                appendToTerminal('Error: OpenRouter model name is required\n', 'error');
                return;
            }
            model = customModel;
        }
        
        // Clear the terminal output
        terminalOutput.innerHTML = '';
        appendToTerminal(`Starting AutoAgent in ${mode} mode with ${model}...\n`);
        
        // Disable UI elements
        setUIState(true, false);
        
        // Send request to start the agent with API keys
        fetch('/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode,
                model,
                openai_key: document.getElementById('openai-key').value,
                anthropic_key: document.getElementById('anthropic-key').value,
                deepseek_key: document.getElementById('deepseek-key').value,
                gemini_key: document.getElementById('gemini-key').value,
                groq_key: document.getElementById('groq-key').value,
                huggingface_key: document.getElementById('huggingface-key').value,
                xai_key: document.getElementById('xai-key').value,
                openrouter_key: document.getElementById('openrouter-key').value
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                isAgentRunning = true;
                statusText.textContent = `Running (${mode} mode)`;
                appendToTerminal(`Agent started successfully.\n`);
                
                // Start polling for output
                startPolling();
                
                // Enable UI elements
                setUIState(true, true);
            } else {
                appendToTerminal(`Error starting agent: ${data.message}\n`, 'error');
                statusText.textContent = 'Error';
                
                // Reset UI state
                setUIState(false, false);
            }
        })
        .catch(error => {
            appendToTerminal(`Network error: ${error.message}\n`, 'error');
            statusText.textContent = 'Error';
            
            // Reset UI state
            setUIState(false, false);
        });
    }

    // Stop the agent
    function stopAgent() {
        appendToTerminal(`Stopping agent...\n`);
        
        // Disable UI elements
        commandInput.disabled = true;
        sendBtn.disabled = true;
        
        fetch('/stop', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                isAgentRunning = false;
                statusText.textContent = 'Stopped';
                appendToTerminal(`Agent stopped.\n`);
                
                // Stop polling
                stopPolling();
                
                // Reset UI state
                setUIState(false, false);
            } else {
                appendToTerminal(`Error stopping agent: ${data.message}\n`, 'error');
                
                if (isAgentRunning) {
                    setUIState(true, true);
                }
            }
        })
        .catch(error => {
            appendToTerminal(`Network error: ${error.message}\n`, 'error');
            
            if (isAgentRunning) {
                setUIState(true, true);
            }
        });
    }

    // Send a command to the agent
    function sendCommand() {
        const command = commandInput.value.trim();
        if (!command) return;
        
        appendToTerminal(`> ${command}`, 'command');
        commandInput.value = '';
        
        fetch('/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') {
                appendToTerminal(`Error sending command: ${data.message}\n`, 'error');
            }
        })
        .catch(error => {
            appendToTerminal(`Network error: ${error.message}\n`, 'error');
        });
    }

    // Start polling for output
    function startPolling() {
        stopPolling();
        pollingInterval = setInterval(pollOutput, 500);
    }

    // Stop polling for output
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    // Poll for output
    function pollOutput() {
        fetch('/output')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                if (isAgentRunning !== data.running) {
                    isAgentRunning = data.running;
                    
                    if (!isAgentRunning) {
                        statusText.textContent = 'Stopped';
                        setUIState(false, false);
                        stopPolling();
                        appendToTerminal(`Agent process has ended.\n`);
                    }
                }
                
                if (data.output) {
                    appendToTerminal(data.output);
                }
            }
        })
        .catch(error => {
            console.error('Error polling output:', error);
        });
    }

    // Set UI state
    function setUIState(isStarted, isReady) {
        startBtn.disabled = isStarted;
        stopBtn.disabled = !isStarted;
        
        modeSelect.disabled = isStarted;
        modelSelect.disabled = isStarted;
        
        commandInput.disabled = !isReady;
        sendBtn.disabled = !isReady;
    }

    // Initialize the UI
    init();
});