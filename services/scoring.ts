
import { MetricType, LLMModel } from '../types';
import { generateCompletion } from './llm';

// --- Helper Functions for Metrics ---

// Simplified BLEU-1 (Unigram precision)
const calculateBleu = (output: string, reference: string): number => {
  if (!reference || !output) return 0;
  const outTokens = output.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const refTokens = reference.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  
  if (outTokens.length === 0) return 0;
  
  let matches = 0;
  // Basic unigram count (without clipping for simplicity in this demo)
  outTokens.forEach(t => {
    if (refTokens.includes(t)) matches++;
  });
  
  return matches / Math.max(outTokens.length, 1);
};

// ROUGE-L (Longest Common Subsequence)
const calculateRougeL = (output: string, reference: string): number => {
  if (!reference || !output) return 0;
  const s1 = output.toLowerCase().split(/\s+/);
  const s2 = reference.toLowerCase().split(/\s+/);
  const m = s1.length;
  const n = s2.length;
  
  // DP Table for LCS
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs = dp[m][n];
  // F1 Score calculation for ROUGE-L
  const p = lcs / (m || 1);
  const r = lcs / (n || 1);
  if (p + r === 0) return 0;
  return (2 * p * r) / (p + r);
};

export const calculateScores = async (
  input: string,
  output: string,
  reference: string | undefined,
  metrics: MetricType[],
  judgeModel?: LLMModel,
  customCode?: string
): Promise<Record<string, number | boolean>> => {
  const results: Record<string, number | boolean> = {};

  for (const metric of metrics) {
    switch (metric) {
      case MetricType.EXACT_MATCH:
        results[MetricType.EXACT_MATCH] = output.trim() === (reference || '').trim();
        break;

      case MetricType.JSON_VALIDITY:
        try {
          JSON.parse(output);
          results[MetricType.JSON_VALIDITY] = 1; // 1 for true
        } catch {
          results[MetricType.JSON_VALIDITY] = 0; // 0 for false
        }
        break;

      case MetricType.LENGTH:
        results[MetricType.LENGTH] = output.length;
        break;
      
      case MetricType.CONTAINS_KEYWORD:
        if (!reference) {
            results[MetricType.CONTAINS_KEYWORD] = 0;
        } else {
            const keywords = reference.split(' ');
            const matches = keywords.filter(k => output.includes(k));
            results[MetricType.CONTAINS_KEYWORD] = matches.length / keywords.length;
        }
        break;

      case MetricType.BLEU:
        results[MetricType.BLEU] = calculateBleu(output, reference || '');
        break;

      case MetricType.ROUGE:
        results[MetricType.ROUGE] = calculateRougeL(output, reference || '');
        break;

      case MetricType.CUSTOM:
        if (customCode) {
            try {
                // Safe(r) execution in browser using Function constructor
                // Note: In a real production app, this should be sandboxed on backend (e.g. Python/Pyodide)
                // Variables available: input, output, reference
                const evaluator = new Function('input', 'output', 'reference', customCode);
                const res = evaluator(input, output, reference);
                results[MetricType.CUSTOM] = typeof res === 'number' || typeof res === 'boolean' ? res : 0;
            } catch (e) {
                console.error("Custom metric execution failed", e);
                results[MetricType.CUSTOM] = 0;
            }
        } else {
            results[MetricType.CUSTOM] = 0;
        }
        break;

      case MetricType.LLM_JUDGE:
        if (judgeModel) {
          try {
            const prompt = `
            Act as an impartial judge. Evaluate the quality of the AI response based on the user input and reference answer.
            User Input: ${input}
            Reference Answer: ${reference || 'N/A'}
            AI Response: ${output}
            
            Rate the AI Response on a scale from 1 to 10. Return ONLY the number.
            `;
            
            const judgeRes = await generateCompletion(judgeModel, [{ role: 'user', content: prompt }], 0);
            const score = parseInt(judgeRes.content.match(/\d+/)?.[0] || "0");
            results[MetricType.LLM_JUDGE] = isNaN(score) ? 0 : score;
          } catch (e) {
            results[MetricType.LLM_JUDGE] = 0;
          }
        } else {
          results[MetricType.LLM_JUDGE] = 0;
        }
        break;
    }
  }
  return results;
};
