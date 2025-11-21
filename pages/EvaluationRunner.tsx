
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/AppContext';
import { MetricType, EvaluationRun, EvaluationResultItem } from '../types';
import { METRIC_LABELS, DEFAULT_SYSTEM_PROMPT, METRIC_TOOLTIPS } from '../constants';
import { generateCompletion } from '../services/llm';
import { calculateScores } from '../services/scoring';
import { ParallelExecutor } from '../services/parallelExecutor';
import { v4 as uuidv4 } from 'uuid';
import { InfoTooltip } from '../components/InfoTooltip';

export const EvaluationRunner: React.FC = () => {
  const { datasets, models, addRun, updateRun, t } = useAppStore();
  const navigate = useNavigate();

  // Form State
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>([]);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [judgeModelId, setJudgeModelId] = useState('');
  const [customCode, setCustomCode] = useState<string>('');

  const handleModelToggle = (id: string) => {
    setSelectedModelIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleMetricToggle = (m: MetricType) => {
    setSelectedMetrics(prev => 
        prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const startEvaluation = async () => {
    const dataset = datasets.find(d => d.id === selectedDatasetId);
    if (!dataset || selectedModelIds.length === 0 || selectedMetrics.length === 0) {
        alert(t('eval.alert'));
        return;
    }

    const runId = uuidv4();
    const newRun: EvaluationRun = {
        id: runId,
        configId: uuidv4(),
        configSnapshot: {
            id: uuidv4(),
            name: `Eval ${new Date().toLocaleTimeString()}`,
            datasetId: selectedDatasetId,
            modelIds: selectedModelIds,
            metrics: selectedMetrics,
            systemPrompt,
            judgeModelId,
            customMetricCode: customCode
        },
        timestamp: new Date().toISOString(),
        status: 'running',
        progress: 0,
        total: dataset.items.length * selectedModelIds.length,
        results: []
    };

    addRun(newRun);
    navigate('/results'); // Redirect immediately to results to watch progress

    // Start Async Processing with Parallel Execution
    const judgeModel = models.find(m => m.id === judgeModelId);
    let completedCount = 0;
    const allResults: EvaluationResultItem[] = [];

    // Create parallel executors for each model based on their maxConcurrency setting
    const modelExecutors = new Map<string, ParallelExecutor>();
    selectedModelIds.forEach(modelId => {
        const model = models.find(m => m.id === modelId);
        if (model) {
            modelExecutors.set(modelId, new ParallelExecutor(model.maxConcurrency || 16));
        }
    });

    // Create all evaluation tasks
    const evaluationTasks: Promise<void>[] = [];

    for (const item of dataset.items) {
        for (const modelId of selectedModelIds) {
            const model = models.find(m => m.id === modelId);
            const executor = modelExecutors.get(modelId);
            
            if (!model || !executor) continue;

            const task = async () => {
                const messages = [
                    { role: 'system' as const, content: systemPrompt },
                    { role: 'user' as const, content: typeof item.input === 'string' ? item.input : JSON.stringify(item.input) }
                ];

                try {
                    // 1. Generate
                    const { content, latency } = await generateCompletion(model, messages);

                    // 2. Score
                    const scores = await calculateScores(
                        typeof item.input === 'string' ? item.input : JSON.stringify(item.input),
                        content,
                        item.reference,
                        selectedMetrics,
                        judgeModel,
                        customCode
                    );

                    const resultItem: EvaluationResultItem = {
                        itemId: item.id,
                        modelId: model.id,
                        input: typeof item.input === 'string' ? item.input : JSON.stringify(item.input),
                        output: content,
                        reference: item.reference,
                        scores,
                        latencyMs: latency
                    };

                    // Add result and update progress
                    allResults.push(resultItem);
                    completedCount++;
                    
                    // Update progress
                    updateRun(runId, {
                        progress: completedCount,
                        results: [...allResults] // Incremental update
                    });
                } catch (error) {
                    console.error(`Evaluation failed for item ${item.id} with model ${model.name}:`, error);
                    
                    // Add error result
                    const errorResult: EvaluationResultItem = {
                        itemId: item.id,
                        modelId: model.id,
                        input: typeof item.input === 'string' ? item.input : JSON.stringify(item.input),
                        output: `[ERROR]: ${(error as Error).message}`,
                        reference: item.reference,
                        scores: Object.fromEntries(selectedMetrics.map(m => [m, 0])),
                        latencyMs: 0
                    };
                    
                    allResults.push(errorResult);
                    completedCount++;
                    
                    updateRun(runId, {
                        progress: completedCount,
                        results: [...allResults]
                    });
                }
            };

            // Queue the task for parallel execution
            evaluationTasks.push(executor.execute(task));
        }
    }

    // Wait for all tasks to complete
    try {
        await Promise.all(evaluationTasks);
        updateRun(runId, { status: 'completed' });
    } catch (error) {
        console.error('Evaluation batch failed:', error);
        updateRun(runId, { status: 'failed' });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">{t('eval.title')}</h1>

      <div className="space-y-8 bg-white p-8 rounded-lg shadow-sm border border-slate-200">
        
        {/* Dataset Selection */}
        <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">{t('eval.step1')}</label>
            <select 
                className="w-full border-slate-300 rounded-md shadow-sm p-2 border"
                value={selectedDatasetId}
                onChange={e => setSelectedDatasetId(e.target.value)}
            >
                <option value="">{t('eval.chooseDs')}</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.items.length} items)</option>)}
            </select>
        </div>

        {/* Model Selection */}
        <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">{t('eval.step2')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map(m => (
                    <div 
                        key={m.id} 
                        onClick={() => handleModelToggle(m.id)}
                        className={`cursor-pointer p-4 rounded border transition ${selectedModelIds.includes(m.id) ? 'border-primary bg-blue-50 ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-slate-500">{m.modelId}</div>
                    </div>
                ))}
            </div>
            {models.length === 0 && <p className="text-red-500 text-sm mt-2">{t('eval.noModels')}</p>}
        </div>

        {/* Metrics Selection */}
        <div>
            <label className="block text-lg font-semibold text-slate-900 mb-2">{t('eval.step3')}</label>
            <div className="flex flex-wrap gap-3">
                {Object.keys(METRIC_LABELS).map((key) => (
                    <button
                        key={key}
                        onClick={() => handleMetricToggle(key as MetricType)}
                        className={`flex items-center px-4 py-2 rounded-full text-sm font-medium border transition ${selectedMetrics.includes(key as MetricType) ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {t(`metric.${key}`)}
                        {METRIC_TOOLTIPS[key] && <InfoTooltip content={METRIC_TOOLTIPS[key]} />}
                    </button>
                ))}
            </div>
            
            {selectedMetrics.includes(MetricType.LLM_JUDGE) && (
                <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('eval.selectJudge')}</label>
                    <select 
                        className="w-full border-slate-300 rounded-md p-2 border"
                        value={judgeModelId}
                        onChange={e => setJudgeModelId(e.target.value)}
                    >
                        <option value="">{t('eval.chooseJudge')}</option>
                        {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            )}

            {selectedMetrics.includes(MetricType.CUSTOM) && (
                <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center mb-2">
                         <label className="block text-sm font-medium text-slate-700">{t('eval.step5')}</label>
                         <InfoTooltip content="Python execution requires a backend service. For this browser-based demo, we execute JavaScript in a sandbox." />
                    </div>
                    <textarea 
                        className="w-full border-slate-300 rounded-md p-2 border font-mono text-sm h-32 bg-slate-900 text-green-400"
                        value={customCode}
                        onChange={e => setCustomCode(e.target.value)}
                        placeholder={t('eval.codePlaceholder')}
                    />
                </div>
            )}
        </div>

        {/* Prompt Config */}
        <div>
             <label className="block text-lg font-semibold text-slate-900 mb-2">{t('eval.step4')}</label>
             <textarea 
                className="w-full border-slate-300 rounded-md shadow-sm p-2 border font-mono text-sm h-24"
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
             />
        </div>

        <div className="pt-4">
            <button
                onClick={startEvaluation}
                className="w-full bg-primary hover:bg-blue-700 text-white text-lg font-bold py-4 rounded shadow-lg transition transform active:scale-95"
            >
                {t('eval.runBtn')}
            </button>
        </div>
      </div>
    </div>
  );
};
