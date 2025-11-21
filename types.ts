
export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'openrouter' | 'custom';
  baseUrl: string;
  apiKey: string;
  modelId: string; // e.g., "gpt-4", "google/gemini-flash-1.5"
  maxConcurrency?: number; // Maximum parallel requests, default 16
}

export interface DatasetItem {
  id: string;
  input: string | Record<string, any>;
  reference?: string;
  [key: string]: any;
}

export interface Dataset {
  id: string;
  name: string;
  createdAt: string;
  items: DatasetItem[];
}

export enum MetricType {
  EXACT_MATCH = 'EXACT_MATCH',
  JSON_VALIDITY = 'JSON_VALIDITY',
  CONTAINS_KEYWORD = 'CONTAINS_KEYWORD',
  LLM_JUDGE = 'LLM_JUDGE',
  LENGTH = 'LENGTH',
  BLEU = 'BLEU',
  ROUGE = 'ROUGE',
  CUSTOM = 'CUSTOM'
}

export interface EvaluationConfig {
  id: string;
  name: string;
  datasetId: string;
  modelIds: string[];
  metrics: MetricType[];
  systemPrompt: string;
  judgeModelId?: string;
  customMetricCode?: string; // JS code for custom calculation
}

export interface EvaluationResultItem {
  itemId: string;
  modelId: string;
  input: string;
  output: string;
  reference?: string;
  scores: Record<string, number | boolean>; // Metric -> Score
  latencyMs: number;
}

export interface EvaluationRun {
  id: string;
  configId: string;
  configSnapshot: EvaluationConfig;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  total: number;
  results: EvaluationResultItem[];
}

export interface AggregatedScore {
  modelId: string;
  modelName: string;
  metrics: Record<string, number>; // Average scores
}
