import { LLMModel } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const fetchModelList = async (baseUrl: string, apiKey: string) => {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    const data = await response.json();
    return data.data || []; // Assuming standard OpenAI format { data: [{id: ...}] }
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
};

export const generateCompletion = async (
  model: LLMModel,
  messages: ChatMessage[],
  temperature = 0.7
): Promise<{ content: string; latency: number }> => {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${model.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${model.apiKey}`,
        'Content-Type': 'application/json',
        // OpenRouter specific headers
        ...(model.provider === 'openrouter' ? {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'EvalMatrix',
        } : {})
      },
      body: JSON.stringify({
        model: model.modelId,
        messages,
        temperature,
        max_tokens: 1000, 
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const endTime = performance.now();

    return {
      content,
      latency: endTime - startTime
    };
  } catch (error) {
    console.error(`Generation failed for ${model.name}:`, error);
    return { content: `[ERROR]: ${(error as Error).message}`, latency: 0 };
  }
};
