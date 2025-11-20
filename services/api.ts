import { Dataset, LLMModel, EvaluationRun } from '../types';

const API_BASE = '/api';

// Helper to check if we are in "server mode" (connected to backend)
// vs "local mode" (pure browser). For this implementation, we assume
// if fetch fails, we fallback or show error, but we prioritize API.

export const apiService = {
  healthCheck: async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- Models ---
  getModels: async (): Promise<LLMModel[]> => {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  },

  addModel: async (model: LLMModel): Promise<LLMModel> => {
    const res = await fetch(`${API_BASE}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model)
    });
    if (!res.ok) throw new Error('Failed to save model');
    return res.json();
  },

  deleteModel: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/models/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete model');
  },

  // --- Datasets ---
  getDatasets: async (): Promise<Dataset[]> => {
    const res = await fetch(`${API_BASE}/datasets`);
    if (!res.ok) throw new Error('Failed to fetch datasets');
    return res.json();
  },

  addDataset: async (dataset: Dataset): Promise<Dataset> => {
    const res = await fetch(`${API_BASE}/datasets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataset)
    });
    if (!res.ok) throw new Error('Failed to save dataset');
    return res.json();
  },

  // --- Runs ---
  getRuns: async (): Promise<EvaluationRun[]> => {
    const res = await fetch(`${API_BASE}/runs`);
    if (!res.ok) throw new Error('Failed to fetch runs');
    return res.json();
  },

  addRun: async (run: EvaluationRun): Promise<EvaluationRun> => {
    const res = await fetch(`${API_BASE}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run)
    });
    if (!res.ok) throw new Error('Failed to create run');
    return res.json();
  },

  updateRun: async (id: string, updates: Partial<EvaluationRun>): Promise<void> => {
    const res = await fetch(`${API_BASE}/runs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update run');
  }
};
