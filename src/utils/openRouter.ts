import { LLMModel, Message } from "../types";

export const FREE_MODELS: LLMModel[] = [
  {
    id: "deepseek/deepseek-v4-flash:free",
    name: "DeepSeek V4 Flash (Free)",
    provider: "DeepSeek",
    contextLength: 1048576,
    description: "Highly optimized, lightning-fast response model with a massive 1M context window. Elite for chat & overall coordination.",
    isFree: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B Instruct (Free)",
    provider: "Meta",
    contextLength: 131072,
    description: "Meta's flagship 70B parameters model with state-of-the-art context understanding, rich coding, and reasoning capability.",
    isFree: true,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B (Free)",
    provider: "Google",
    contextLength: 262144,
    description: "Google's latest state-of-the-art open models series. Excellent instructions alignment and high developer accuracy.",
    isFree: true,
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder (Free)",
    provider: "Alibaba",
    contextLength: 1048576,
    description: "Alibaba's robust coding power-lifter with 1M context window. Ultimate copilot for software architectural logic and scripting.",
    isFree: true,
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B Instruct (Free)",
    provider: "Meta",
    contextLength: 131072,
    description: "Meta's highly optimized lightweight model with ultra-low latency and versatile prompt alignment.",
    isFree: true,
  }
];

// Fallback sequence: if one fails, we cycle down this list
export function getAlternateModel(failedModelId: string): LLMModel {
  const stableFallback = FREE_MODELS[0]; // deepseek/deepseek-v4-flash:free
  if (failedModelId !== stableFallback.id) {
    return stableFallback; 
  }
  return FREE_MODELS[1]; // meta-llama/llama-3.3-70b-instruct:free
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

export interface ChatCompletionResult {
  content: string;
  modelUsed: string;
  fallbacked: boolean;
  originalModel?: string;
  errorMsg?: string;
}

/**
 * Executes a single completion request to the Express API proxy backend.
 */
async function makeCompletionRequest(
  messages: Array<{ role: string; content: string }>,
  modelId: string
): Promise<string> {
  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      // Not JSON format
    }
    const remoteMsg = parsedErr?.error?.message || parsedErr?.message || errText;
    throw new Error(`Server Proxy Error (${response.status}): ${remoteMsg}`);
  }

  const data: OpenRouterResponse = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || `API returned error code ${data.error.code}`);
  }

  if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
    throw new Error("Proxy response returned an empty choices container.");
  }

  return data.choices[0].message.content;
}

/**
 * Resiliently sends a chat request, falling back sequentially
 * through other configured free models server-side if rate-limited or offline.
 */
export async function sendChatRequest(
  messages: Array<{ role: string; content: string }>,
  modelId: string
): Promise<ChatCompletionResult> {
  const attemptedErrors: string[] = [];

  // 1. Attempt the user's selected primary model
  try {
    const content = await makeCompletionRequest(messages, modelId);
    return {
      content,
      modelUsed: modelId,
      fallbacked: false
    };
  } catch (primaryError: any) {
    const errMsg = primaryError.message || String(primaryError);
    console.warn(`Primary model limit/error with ${modelId}: ${errMsg}. Proceeding to fallback loop...`);
    attemptedErrors.push(`${modelId}: ${errMsg}`);

    // 2. Fall back sequentially by looping through other free models
    const fallbackCandidates = FREE_MODELS.filter(m => m.id !== modelId);

    for (const candidate of fallbackCandidates) {
      console.warn(`Falling back: requesting ${candidate.id} instead...`);
      try {
        const content = await makeCompletionRequest(messages, candidate.id);
        return {
          content,
          modelUsed: candidate.id,
          fallbacked: true,
          originalModel: modelId,
          errorMsg: errMsg
        };
      } catch (fallbackError: any) {
        const fallbackMsg = fallbackError.message || String(fallbackError);
        console.error(`Fallback to ${candidate.id} also failed: ${fallbackMsg}`);
        attemptedErrors.push(`${candidate.id}: ${fallbackMsg}`);
      }
    }

    // 3. If ALL configured free models failed cascade, throw a comprehensive error
    throw new Error(
      `Failed to handle request on chosen model of choice (${modelId}), and subsequent fallbacks all failed due to heavy OpenRouter load/rate limits.\n\n` +
      `Attempted endpoints and errors:\n` +
      attemptedErrors.map(e => `• ${e}`).join("\n")
    );
  }
}
