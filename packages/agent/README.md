# ContextPilot

ContextPilot is a local-first laptop agent that lets the ContextPilot mobile app securely pair with a developer workstation over a local network. It displays a pairing QR code, authenticates the phone, and can run approved development workflows inside the directory where it starts.

> This is an MVP intended for trusted local development networks. Review the security notes before using it with real projects.

## Requirements

- Node.js 18 or later
- A local network shared by the laptop and phone
- Optional: [Ollama](https://ollama.com/) for local AI planning. Without it, ContextPilot uses its deterministic mock AI fallback.

## Install and run

Run the agent from the root of the project you want to work on:

```sh
npm install -g contextpilot
cd /path/to/your/project
contextpilot start
```

Or run it without a global install:

```sh
npx contextpilot start
```

The command prints a QR code. Scan it from the ContextPilot mobile app to pair. Pairing tokens expire after five minutes.

## CLI commands

```sh
# Start the agent (default command)
contextpilot start

# Choose a port, AI model, or force the offline mock adapter
contextpilot start --port 8765 --model qwen2.5-coder
contextpilot start --mock-ai

# Check Node, workspace, and Ollama availability
contextpilot doctor

# Test a running agent from another terminal
contextpilot mock-client --host 127.0.0.1 --port 8765 --token YOUR_TOKEN
```

If the requested port is occupied, ContextPilot automatically tries the next available port (up to ten ports). On Windows it also prints the firewall command needed to allow phone connections.

## Configuration

Environment variables are optional:

| Variable | Default | Description |
| --- | --- | --- |
| `CONTEXTPILOT_PORT` | `8765` | WebSocket and HTTP server port |
| `CONTEXTPILOT_HOST` | `0.0.0.0` | Bind address |
| `CONTEXTPILOT_MODEL` | `qwen2.5-coder` | Ollama model name |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama server URL |
| `CONTEXTPILOT_USE_MOCK` | `false` | Use the offline mock AI adapter |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |
| `TOKEN_TTL_SECONDS` | `300` | Pairing-token lifetime |

## Security

- Start the agent only from a workspace you trust.
- Pair only with devices you trust on a private network.
- Keep pairing QR codes and tokens private; tokens grant access for their configured lifetime.
- ContextPilot validates requests and requires approval for review/dangerous operations, but it can execute actions in your workspace after approval.
- Do not expose the agent directly to the public internet.

## Development

```sh
npm install
npm run build
npm test
npm run dev
```

`npm run build` compiles TypeScript to `dist/`. The published package contains only the compiled output, CLI launcher, README, and license.

## License

MIT. See [LICENSE](LICENSE).
