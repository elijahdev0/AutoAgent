# AutoAgent Web Interface

This is a web interface for AutoAgent, providing a browser-based way to interact with the AutoAgent CLI tool.

## Features

- Interactive web terminal interface
- Support for all AutoAgent modes (main, deep-research)
- Real-time output streaming
- Support for different LLM models
- Easy to use UI with status indicators

## Setup and Usage

### Prerequisites

- Docker and Docker Compose installed
- AutoAgent repository cloned
- API keys configured in `.env` file

### Running the Web Interface

1. Start the AutoAgent web interface using Docker Compose:

```bash
docker-compose up -d
```

2. Access the web interface at: `http://your-server-ip:8080`

If you're running locally, use: `http://localhost:8080`

### Using the Interface

1. Select your desired mode:
   - **Full AutoAgent**: Access to all AutoAgent features
   - **Deep Research (User Mode)**: Lightweight version for user interactions

2. Select the LLM model you want to use

3. Click "Start Agent" to initialize AutoAgent

4. Once started, you can interact with AutoAgent by typing in the terminal input field

5. To stop the agent, click the "Stop Agent" button

## Troubleshooting

If you encounter issues:

1. Check Docker logs:
```bash
docker-compose logs -f web_ui
```

2. Ensure all required API keys are set in your `.env` file

3. Verify that the `auto` command works directly on your system

## Customization

You can customize the port by modifying the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "your-custom-port:5000"
```

## Security Notice

This web interface is intended for use in trusted environments. It does not include authentication or advanced security features by default.

For production use, consider adding authentication and running behind a secure proxy like Nginx with HTTPS. 