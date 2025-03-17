from flask import Flask, render_template, request, jsonify
import subprocess
import threading
import time
import os
import signal
import pty
import select
import fcntl
import termios
import struct
import queue

app = Flask(__name__)
app.config['SECRET_KEY'] = 'autoagent-secret-key'

# Queue for storing output from AutoAgent
output_queue = queue.Queue()
# Global process variable
agent_process = None
# Flag to indicate if process is running
process_running = False

@app.route('/')
def index():
    """Render the main interface page"""
    return render_template('index.html')

def set_nonblocking(fd):
    """Set the file descriptor to non-blocking mode"""
    flags = fcntl.fcntl(fd, fcntl.F_GETFL)
    fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

def read_output(fd):
    """Read output from the process and put it in the queue"""
    global process_running
    
    set_nonblocking(fd)
    
    while process_running:
        try:
            r, _, _ = select.select([fd], [], [], 0.1)
            if r:
                output = os.read(fd, 4096).decode('utf-8', errors='replace')
                if output:
                    output_queue.put(output)
        except (OSError, IOError) as e:
            # Process might have terminated
            process_running = False
            break
        except Exception as e:
            print(f"Error reading output: {e}")
            break
        time.sleep(0.1)

@app.route('/start', methods=['POST'])
def start_agent():
    """Start the AutoAgent CLI process"""
    global agent_process, process_running
    
    mode = request.json.get('mode', 'main')
    model = request.json.get('model', 'claude-3-5-sonnet-20241022')
    
    if process_running:
        return jsonify({'status': 'error', 'message': 'Agent already running'})
    
    try:
        env = os.environ.copy()
        if model != 'claude-3-5-sonnet-20241022':
            env['COMPLETION_MODEL'] = model
        
        # Use pty to create pseudo-terminal for interactive CLI
        master, slave = pty.openpty()
        
        # Start the process with auto main command
        agent_process = subprocess.Popen(
            ['auto', mode],
            stdin=slave,
            stdout=slave,
            stderr=slave,
            env=env,
            start_new_session=True,
            universal_newlines=True
        )
        
        os.close(slave)
        process_running = True
        
        # Start a thread to continuously read output
        output_thread = threading.Thread(target=read_output, args=(master,))
        output_thread.daemon = True
        output_thread.start()
        
        return jsonify({'status': 'success', 'message': f'Started AutoAgent in {mode} mode'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Failed to start agent: {str(e)}'})

@app.route('/stop', methods=['POST'])
def stop_agent():
    """Stop the running AutoAgent process"""
    global agent_process, process_running
    
    if not process_running or agent_process is None:
        return jsonify({'status': 'error', 'message': 'No agent is running'})
    
    try:
        # Send SIGTERM to the process group
        os.killpg(os.getpgid(agent_process.pid), signal.SIGTERM)
        
        # Wait a bit for process to terminate
        time.sleep(1)
        
        # Force kill if still running
        if agent_process.poll() is None:
            os.killpg(os.getpgid(agent_process.pid), signal.SIGKILL)
        
        process_running = False
        agent_process = None
        
        return jsonify({'status': 'success', 'message': 'Agent stopped'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Failed to stop agent: {str(e)}'})

@app.route('/send', methods=['POST'])
def send_command():
    """Send a command to the running AutoAgent process"""
    global agent_process, process_running
    
    if not process_running or agent_process is None:
        return jsonify({'status': 'error', 'message': 'No agent is running'})
    
    command = request.json.get('command', '')
    
    try:
        # Send command to process stdin
        agent_process.stdin.write(command + '\n')
        agent_process.stdin.flush()
        
        return jsonify({'status': 'success', 'message': 'Command sent'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Failed to send command: {str(e)}'})

@app.route('/output', methods=['GET'])
def get_output():
    """Get any accumulated output from the agent process"""
    output = []
    
    # Get all available output from the queue
    try:
        while not output_queue.empty():
            output.append(output_queue.get_nowait())
    except queue.Empty:
        pass
    
    return jsonify({
        'status': 'success', 
        'running': process_running,
        'output': ''.join(output)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 