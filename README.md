# opencode-llama-cpp

OpenCode plugin for enhanced llama.cpp support with auto-detection and dynamic model discovery.

**NOTE:** All providers that match prefix `"llama.cpp*"` will be handled by the plugin

## Features

- **Auto-detection**: Automatically detects llama.cpp server running on common ports (1234, 8080, 11434)
- **Dynamic Model Discovery**: Queries llama.cpp's `/v1/models` endpoint to discover available models
- **Smart Model Formatting**: Automatically formats model names for better readability (e.g., "Qwen3 30B A3B" instead of "qwen/qwen3-30b-a3b")
- **Organization Owner Extraction**: Extracts and sets `organizationOwner` field from model IDs
- **Health Check Monitoring**: Verifies llama.cpp server is accessible before attempting operations
- **Automatic Configuration**: Auto-creates `llama.cpp` provider if detected but not configured
- **Provider Prefix Matching**: Applies to any provider whose ID starts with `llama.cpp*` such as `llama.cpp`, `llama.cpp@m`, or `llama.cpp-fast`
- **Model Merging**: Intelligently merges discovered models with existing configuration
- **Comprehensive Caching**: Reduces API calls with intelligent caching system
- **Error Handling**: Smart error categorization with auto-fix suggestions

## Installation

### From GitHub with pnpm

```bash
pnpm add github:ggppdk/opencode-llama.cpp
```

This installs this fork from GitHub instead of the upstream npm release.

Then point OpenCode at the installed local entry file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "./node_modules/opencode-plugin-llama.cpp/src/index.ts"
  ]
}
```

### From GitHub source

OpenCode also documents plugin loading from local file paths. If you want the most explicit fork-safe setup, clone this repository locally and point OpenCode at the entry file:

```bash
git clone https://github.com/ggppdk/opencode-llama.cpp.git ~/.opencode/plugins/opencode-llama.cpp
```

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///home/YOUR_USER/.opencode/plugins/opencode-llama.cpp/src/index.ts"
  ]
}
```

## Usage

The plugin recognizes any provider whose key starts with `llama.cpp`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///home/YOUR_USER/.opencode/plugins/opencode-llama.cpp/src/index.ts"
  ],
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama.cpp",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"
      }
    },
    "llama.cpp@m": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama.cpp@m",
      "options": {
        "baseURL": "http://127.0.0.1:1235/v1"
      }
    }
  }
}
```

### Auto-detection

If you don't configure any `llama.cpp*` provider, the plugin will automatically detect a llama.cpp server if it's running on one of the common ports and create a default `llama.cpp` provider for you.

### Manual Configuration

You can also manually configure one or more `llama.cpp*` providers with specific models:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///home/YOUR_USER/.opencode/plugins/opencode-llama.cpp/src/index.ts"
  ],
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama.cpp",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"
      },
      "models": {
        "google/gemma-3n-e4b": {
          "name": "Gemma 3n-e4b (local)"
        }
      }
    },
    "llama.cpp@m": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama.cpp@m",
      "options": {
        "baseURL": "http://127.0.0.1:1235/v1"
      }
    }
  }
}
```

The plugin will automatically discover and add any additional models available in each matching `llama.cpp*` provider that aren't already configured.

## How It Works

1. On OpenCode startup, the plugin's `config` hook is called
2. It finds every provider whose ID starts with `llama.cpp`
3. For each matching provider, it checks if the configured llama.cpp server is accessible
4. If none are configured, it attempts to auto-detect a llama.cpp server on common ports
5. If accessible, it queries that server's `/v1/models` endpoint
6. Discovered models are merged into the matching provider configuration
6. The enhanced configuration is used for the current session

## Requirements

- OpenCode with plugin support
- llama.cpp server running locally (default port: 1234)
- llama.cpp server API accessible at `http://127.0.0.1:1234/v1`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
