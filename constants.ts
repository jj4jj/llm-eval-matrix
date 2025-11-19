
import { MetricType } from './types';

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant. Please answer the user's query accurately.";

export const METRIC_LABELS: Record<MetricType, string> = {
  [MetricType.EXACT_MATCH]: 'Exact Match',
  [MetricType.JSON_VALIDITY]: 'JSON Validity',
  [MetricType.CONTAINS_KEYWORD]: 'Keyword Check',
  [MetricType.LLM_JUDGE]: 'LLM Judge (1-10)',
  [MetricType.LENGTH]: 'Response Length',
  [MetricType.BLEU]: 'BLEU Score',
  [MetricType.ROUGE]: 'ROUGE-L Score',
  [MetricType.CUSTOM]: 'Custom Script'
};

export const PRESETS_MODELS = [
  {
    name: 'OpenRouter (Free)',
    baseUrl: 'https://openrouter.ai/api/v1',
    provider: 'openrouter'
  },
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    provider: 'openai'
  },
  {
    name: 'Local LiteLLM',
    baseUrl: 'http://localhost:4000',
    provider: 'custom'
  }
];

export const SAMPLE_DATASET_CONTENT = `{"input": "What is the capital of France?", "reference": "Paris"}
{"input": "Convert 100C to Fahrenheit", "reference": "212F"}
{"input": "Write a haiku about code.", "reference": "Code flows like water,\\nLogic builds a bridge of light,\\nBugs fear the sunrise."}`;

export const METRIC_TOOLTIPS: Record<string, string> = {
  [MetricType.EXACT_MATCH]: 'Checks if the output is exactly equal to the reference (case-sensitive or insensitive depending on config).',
  [MetricType.JSON_VALIDITY]: 'Verifies if the output is a valid parsable JSON string.',
  [MetricType.CONTAINS_KEYWORD]: 'Calculates the percentage of reference keywords found in the output.',
  [MetricType.LLM_JUDGE]: 'Uses another LLM (Judge) to rate the quality of the response from 1 to 10 based on input and reference.',
  [MetricType.LENGTH]: 'Simply counts the number of characters in the response.',
  [MetricType.BLEU]: 'Basic BLEU-1 implementation. Measures n-gram overlap between output and reference.',
  [MetricType.ROUGE]: 'ROUGE-L implementation. Measures the Longest Common Subsequence between output and reference.',
  [MetricType.CUSTOM]: 'Execute your own scoring logic using JavaScript. Access to input, output, and reference variables.'
};
