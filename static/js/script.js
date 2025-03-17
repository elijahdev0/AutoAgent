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

    // State
    let isAgentRunning = false;
    let pollingInterval = null;

    // Initialize
    function init() {
        // Event listeners
        startBtn.addEventListener('click', startAgent);
        stopBtn.addEventListener('click', stopAgent);
        sendBtn.addEventListener('click', sendCommand);
        commandInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                sendCommand();
            }
        });

        // Focus on input when clicking anywhere in the terminal
        document.querySelector('.terminal-container').addEventListener('click', function() {
            if (!commandInput.disabled) {
                commandInput.focus();
            }
        });
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
        // Replace common ANSI color codes with spans
        // This is a simple version, you might want to use a library for more complex ANSI code handling
        return text
            .replace(/\x1B\[0m/g, '</span>')
            .replace(/\x1B\[1;31m/g, '<span style="color: #ff5252; font-weight: bold;">') // Bold Red
            .replace(/\x1B\[1;32m/g, '<span style="color: #4CAF50; font-weight: bold;">') // Bold Green
            .replace(/\x1B\[1;33m/g, '<span style="color: #ffca28; font-weight: bold;">') // Bold Yellow
            .replace(/\x1B\[1;34m/g, '<span style="color: #2196F3; font-weight: bold;">') // Bold Blue
            .replace(/\x1B\[1;35m/g, '<span style="color: #E040FB; font-weight: bold;">') // Bold Magenta
            .replace(/\x1B\[1;36m/g, '<span style="color: #00BCD4; font-weight: bold;">') // Bold Cyan
            .replace(/\x1B\[31m/g, '<span style="color: #ff5252;">') // Red
            .replace(/\x1B\[32m/g, '<span style="color: #4CAF50;">') // Green
            .replace(/\x1B\[33m/g, '<span style="color: #ffca28;">') // Yellow
            .replace(/\x1B\[34m/g, '<span style="color: #2196F3;">') // Blue
            .replace(/\x1B\[35m/g, '<span style="color: #E040FB;">') // Magenta
            .replace(/\x1B\[36m/g, '<span style="color: #00BCD4;">') // Cyan
            .replace(/\n/g, '<br>'); // Line breaks
    }

    // Start the agent
    function startAgent() {
        const mode = modeSelect.value;
        const model = modelSelect.value;
        
        // Clear the terminal output
        terminalOutput.innerHTML = '';
        appendToTerminal(`Starting AutoAgent in ${mode} mode with ${model}...\n`);
        
        // Disable UI elements
        setUIState(true, false);
        
        // Send request to start the agent
        fetch('/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mode, model })
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
        
        // Send request to stop the agent
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
                
                // Keep the current UI state
                if (isAgentRunning) {
                    setUIState(true, true);
                }
            }
        })
        .catch(error => {
            appendToTerminal(`Network error: ${error.message}\n`, 'error');
            
            // Keep the current UI state
            if (isAgentRunning) {
                setUIState(true, true);
            }
        });
    }

    // Send a command to the agent
    function sendCommand() {
        const command = commandInput.value.trim();
        if (!command) return;
        
        // Display the command
        appendToTerminal(`> ${command}`, 'command');
        
        // Clear the input
        commandInput.value = '';
        
        // Send the command to the server
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
        // Stop any existing polling
        stopPolling();
        
        // Start a new polling interval
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
                // Update the running state
                if (isAgentRunning !== data.running) {
                    isAgentRunning = data.running;
                    
                    if (!isAgentRunning) {
                        statusText.textContent = 'Stopped';
                        setUIState(false, false);
                        stopPolling();
                        appendToTerminal(`Agent process has ended.\n`);
                    }
                }
                
                // Append any new output
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
        // Start/Stop buttons
        startBtn.disabled = isStarted;
        stopBtn.disabled = !isStarted;
        
        // Mode/Model selects
        modeSelect.disabled = isStarted;
        modelSelect.disabled = isStarted;
        
        // Command input/send
        commandInput.disabled = !isReady;
        sendBtn.disabled = !isReady;
    }

    // Initialize the UI
    init();
}); 