import { LLMModel } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface QueuedTask<T, R> {
  task: () => Promise<R>;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

export class ParallelExecutor {
  private queue: QueuedTask<any, any>[] = [];
  private running = 0;
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = 16) {
    this.maxConcurrency = maxConcurrency;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const { task, resolve, reject } = this.queue.shift()!;
    this.running++;

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.running--;
      // Process next task in queue
      this.processQueue();
    }
  }

  getActiveCount(): number {
    return this.running;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const generateCompletionParallel = async (
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