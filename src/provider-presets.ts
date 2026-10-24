export const PROVIDER_API_OPTIONS = [
  { id: "openai-completions", label: "OpenAI Chat Completions" },
  { id: "openai-responses", label: "OpenAI Responses" },
  { id: "anthropic-messages", label: "Anthropic Messages" },
  { id: "google-generative-ai", label: "Google Generative AI" },
  { id: "bedrock-converse-stream", label: "Amazon Bedrock" },
] as const;

export const LOCAL_PROVIDER_PRESETS = [
  {
    name: "Ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
    api: "openai-completions",
    apiKey: "ollama",
  },
  {
    name: "LM Studio",
    baseUrl: "http://127.0.0.1:1234/v1",
    api: "openai-completions",
    apiKey: "lm-studio",
  },
  {
    name: "vLLM",
    baseUrl: "http://127.0.0.1:8000/v1",
    api: "openai-completions",
    apiKey: "vllm",
  },
] as const;
