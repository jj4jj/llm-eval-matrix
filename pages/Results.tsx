import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../context/AppContext';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MetricType } from '../types';
import { METRIC_LABELS } from '../constants';

export const Results: React.FC = () => {
  const { runs, models, datasets, t } = useAppStore();
  console.log('Results page - runs:', runs, 'length:', runs.length);
  console.log('Results page - models:', models);
  console.log('Results page - datasets:', datasets);
  
  const [selectedRunId, setSelectedRunId] = useState<string>(runs.length > 0 ? runs[0].id : '');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // Update selected run when runs change
  useEffect(() => {
    if (runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id);
    } else if (runs.length > 0 && selectedRunId) {
      // Check if selected run still exists
      const runExists = runs.some(r => r.id === selectedRunId);
      if (!runExists) {
        setSelectedRunId(runs[0].id);
      }
    }
  }, [runs, selectedRunId]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [realTimeProgress, setRealTimeProgress] = useState<{[key: string]: number}>({});

  // Debug: Create test data if needed
  React.useEffect(() => {
    console.log('Results page mounted, checking for test data creation...');
    
    // Check if we should create test data (for debugging)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('createTestData') === 'true') {
      console.log('Creating test data...');
      
      const testModels = [
        {
          "id": "test-model-1",
          "name": "GPT-3.5 Turbo",
          "provider": "openai",
          "baseUrl": "https://api.openai.com/v1",
          "apiKey": "sk-test",
          "modelId": "gpt-3.5-turbo",
          "maxConcurrency": 16
        }
      ];

      const testDataset = {
        "id": "test-dataset-1",
        "name": "Test Math Questions",
        "createdAt": "2025-01-01T10:00:00Z",
        "items": [
          {
            "id": "1",
            "input": "What is 2+2?",
            "reference": "4"
          }
        ]
      };

      const testRun = {
        "id": "test-run-1",
        "configId": "test-config-1",
        "configSnapshot": {
          "id": "test-config-1",
          "name": "Test Evaluation Run",
          "datasetId": "test-dataset-1",
          "modelIds": ["test-model-1"],
          "metrics": ["EXACT_MATCH"],
          "systemPrompt": "You are a helpful assistant.",
          "judgeModelId": "",
          "customMetricCode": ""
        },
        "timestamp": "2025-01-01T12:00:00Z",
        "status": "running" as const,
        "progress": 1,
        "total": 1,
        "results": [
          {
            "itemId": "1",
            "modelId": "test-model-1",
            "input": "What is 2+2?",
            "output": "4",
            "reference": "4",
            "scores": {
              "EXACT_MATCH": 1
            },
            "latencyMs": 1200
          }
        ]
      };

      // Save to localStorage
      localStorage.setItem('models', JSON.stringify(testModels));
      localStorage.setItem('datasets', JSON.stringify([testDataset]));
      localStorage.setItem('runs', JSON.stringify([testRun]));
      
      console.log('Test data created!');
      window.location.reload();
    }
  }, []);

  const selectedRun = runs.find(r => r.id === selectedRunId);
  const dataset = datasets.find(d => d.id === (selectedRun?.configSnapshot?.datasetId || selectedRun?.datasetId));
  
  console.log('Selected run:', selectedRun);
  console.log('Selected dataset:', dataset);
  console.log('Selected run ID:', selectedRunId);

  // Data Processing for Charts
  const aggregations = useMemo(() => {
    if (!selectedRun) return [];
    
    // Safely access configSnapshot with fallback
    const configSnapshot = selectedRun.configSnapshot || selectedRun;
    const modelIds = configSnapshot.modelIds || selectedRun.modelIds || [];
    const metrics = configSnapshot.metrics || selectedRun.metrics || [];
    const results = selectedRun.results || [];
    
    if (!modelIds.length || !results.length) return [];
    
    const modelStats: Record<string, any> = {};
    
    // Initialize
    modelIds.forEach(mid => {
        const mName = models.find(m => m.id === mid)?.name || mid;
        modelStats[mid] = { 
            name: mName, 
            latencyTotal: 0, 
            count: 0,
            ...Object.fromEntries(metrics.map(m => [m, 0])) 
        };
    });

    results.forEach(res => {
        if (modelStats[res.modelId]) {
            modelStats[res.modelId].count++;
            modelStats[res.modelId].latencyTotal += res.latencyMs;
            Object.entries(res.scores).forEach(([metric, val]) => {
                const numericVal = Number(val);
                let score = numericVal;
                if (metric === MetricType.LLM_JUDGE) score = numericVal / 10; // 0-1
                if (metric === MetricType.LENGTH) score = 0; 

                modelStats[res.modelId][metric] += score;
            });
        }
    });

    // Average
    return Object.values(modelStats).map((stat: any) => {
        const finalStat: any = { name: stat.name, id: stat.id };
        metrics.forEach(m => {
            if (m !== MetricType.LENGTH) {
                // Use simple keys for internal logic, use t() for display in charts
                finalStat[t(`metric.${m}`)] = (stat[m] / (stat.count || 1)).toFixed(2);
            }
        });
        finalStat[t('res.latencyTitle')] = Math.round(stat.latencyTotal / (stat.count || 1));
        return finalStat;
    });

  }, [selectedRun, models, t]);

  // Transform for Radar Chart
  const radarData = useMemo(() => {
    if (!selectedRun || aggregations.length === 0) return [];
    const configSnapshot = selectedRun.configSnapshot || selectedRun;
    const metrics = (configSnapshot.metrics || selectedRun.metrics || []).filter(m => m !== MetricType.LENGTH);
    
    return metrics.map(m => {
        const obj: any = { subject: t(`metric.${m}`) };
        aggregations.forEach((agg: any) => {
            obj[agg.name] = parseFloat(agg[t(`metric.${m}`)]);
        });
        return obj;
    });
  }, [aggregations, selectedRun, t]);

  const colors = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#9333ea'];

  // Real-time progress tracking
  useEffect(() => {
    const interval = setInterval(() => {
      runs.forEach(run => {
        if (run.status === 'running') {
          setRealTimeProgress(prev => ({
            ...prev,
            [run.id]: run.progress
          }));
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [runs]);

  if (runs.length === 0) {
    console.log('No runs found, displaying empty state');
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('res.title')}</h1>
          <div className="text-slate-500 mb-8">{t('res.noRuns')}</div>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">To see evaluation results, you need to:</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/datasets" className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                Upload a Dataset
              </a>
              <a href="/models" className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300 transition">
                Configure Models
              </a>
              <a href="/evaluate" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                Run Evaluation
              </a>
            </div>
            <div className="mt-8">
              <button 
                onClick={() => {
                  // Create test data for debugging
                  const testModels = [
                    {
                      "id": "test-model-1",
                      "name": "GPT-3.5 Turbo",
                      "provider": "openai",
                      "baseUrl": "https://api.openai.com/v1",
                      "apiKey": "sk-test",
                      "modelId": "gpt-3.5-turbo",
                      "maxConcurrency": 16
                    },
                    {
                      "id": "test-model-2", 
                      "name": "GPT-4",
                      "provider": "openai",
                      "baseUrl": "https://api.openai.com/v1",
                      "apiKey": "sk-test",
                      "modelId": "gpt-4",
                      "maxConcurrency": 8
                    }
                  ];

                  const testDataset = {
                    "id": "test-dataset-1",
                    "name": "Test Math Questions",
                    "createdAt": "2025-01-01T10:00:00Z",
                    "items": [
                      {
                        "id": "1",
                        "input": "What is 2+2?",
                        "reference": "4"
                      },
                      {
                        "id": "2", 
                        "input": "What is 5*3?",
                        "reference": "15"
                      },
                      {
                        "id": "3",
                        "input": "What is 10-7?",
                        "reference": "3"
                      }
                    ]
                  };

                  const testRun = {
                    "id": "test-run-1",
                    "configId": "test-config-1",
                    "configSnapshot": {
                      "id": "test-config-1",
                      "name": "Test Evaluation Run",
                      "datasetId": "test-dataset-1",
                      "modelIds": ["test-model-1", "test-model-2"],
                      "metrics": ["EXACT_MATCH", "LLM_JUDGE"],
                      "systemPrompt": "You are a helpful assistant. Please answer the user's query accurately.",
                      "judgeModelId": "test-model-1",
                      "customMetricCode": ""
                    },
                    "timestamp": "2025-01-01T12:00:00Z",
                    "status": "running",
                    "progress": 2,
                    "total": 6,
                    "results": [
                      {
                        "itemId": "1",
                        "modelId": "test-model-1",
                        "input": "What is 2+2?",
                        "output": "4",
                        "reference": "4",
                        "scores": {
                          "EXACT_MATCH": 1,
                          "LLM_JUDGE": 9
                        },
                        "latencyMs": 1200
                      },
                      {
                        "itemId": "2",
                        "modelId": "test-model-1",
                        "input": "What is 5*3?",
                        "output": "15",
                        "reference": "15",
                        "scores": {
                          "EXACT_MATCH": 1,
                          "LLM_JUDGE": 8
                        },
                        "latencyMs": 1500
                      }
                    ]
                  };

                  // Save to localStorage
                  localStorage.setItem('models', JSON.stringify(testModels));
                  localStorage.setItem('datasets', JSON.stringify([testDataset]));
                  localStorage.setItem('runs', JSON.stringify([testRun]));
                  
                  console.log('Test data created successfully!');
                  alert('Test data created! Page will refresh to show results.');
                  window.location.reload();
                }}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition"
              >
                Create Test Data (Debug)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where selectedRun doesn't exist
  if (!selectedRun) {
    console.log('Selected run not found, showing runs available');
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('res.title')}</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">Selected run not found. Please select a run from the dropdown.</p>
        </div>
        <select 
          className="border-slate-300 rounded-md shadow-sm p-2 border mb-4"
          value={selectedRunId}
          onChange={e => setSelectedRunId(e.target.value)}
        >
          {runs.map(r => (
            <option key={r.id} value={r.id}>
              {r.configSnapshot?.name || r.name || 'Unnamed Run'} - {new Date(r.createdAt || r.timestamp).toLocaleString()} ({r.status})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('res.title')}</h1>
        <select 
            className="border-slate-300 rounded-md shadow-sm p-2 border"
            value={selectedRunId}
            onChange={e => setSelectedRunId(e.target.value)}
        >
            {runs.map(r => (
                <option key={r.id} value={r.id}>
                    {r.configSnapshot?.name || r.name || 'Unnamed Run'} - {new Date(r.createdAt || r.timestamp).toLocaleString()} ({r.status || 'unknown'})
                </option>
            ))}
        </select>
      </div>

      {/* Evaluation Runs Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">{t('res.runsTableTitle')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.runName')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.dataset')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.models')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.progress')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.createdAt')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {runs.map((run) => {
                const datasetName = datasets.find(d => d.id === (run.datasetId || run.configSnapshot?.datasetId))?.name || 'Unknown Dataset';
                const modelIds = run.modelIds || run.configSnapshot?.modelIds || [];
                const modelNames = modelIds.map(modelId => 
                  models.find(m => m.id === modelId)?.name || modelId
                ).join(', ') || 'No Models';
                
                return (
                  <tr key={run.id} className={`hover:bg-slate-50 ${selectedRunId === run.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {run.configSnapshot?.name || run.name || 'Unnamed Run'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {datasetName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="max-w-xs truncate" title={modelNames}>
                        {modelNames}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        run.status === 'completed' ? 'bg-green-100 text-green-800' :
                        run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        run.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              run.status === 'completed' ? 'bg-green-500' :
                              run.status === 'running' ? 'bg-blue-500' :
                              run.status === 'failed' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}
                            style={{ width: `${run.total > 0 ? ((run.completed || run.progress || 0) / run.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {run.completed || run.progress || 0}/{run.total || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(run.createdAt || run.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedRunId(run.id)}
                        className={`text-primary hover:text-blue-900 ${selectedRunId === run.id ? 'font-bold' : ''}`}
                      >
                        {selectedRunId === run.id ? t('res.currentView') : t('res.viewDetails')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRun && (
        <div className="space-y-8">
            {/* Status Bar */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700">{t('res.progress')}</span>
                    <span className="text-sm text-slate-500">
                        {selectedRun.completed || selectedRun.progress || 0} / {selectedRun.total || 0} {t('res.itemsProcessed')} 
                        ({selectedRun.total > 0 ? Math.round(((selectedRun.completed || selectedRun.progress || 0) / selectedRun.total) * 100) : 0}%)
                    </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedRun.total > 0 ? ((selectedRun.completed || selectedRun.progress || 0) / selectedRun.total) * 100 : 0}%` }}
                    ></div>
                </div>
                {selectedRun.status === 'running' && (
                    <div className="mt-2 flex items-center text-sm text-slate-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        <span>Running evaluation...</span>
                    </div>
                )}
                {selectedRun.status === 'completed' && (
                    <div className="mt-2 text-sm text-green-600">
                        <span>✅ Evaluation completed successfully</span>
                    </div>
                )}
                {selectedRun.status === 'failed' && (
                    <div className="mt-2 text-sm text-red-600">
                        <span>❌ Evaluation failed</span>
                    </div>
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Radar Chart - Metrics */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-4 text-center">{t('res.radarTitle')}</h3>
                    {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis angle={30} domain={[0, 1]} />
                                {selectedRun.configSnapshot.modelIds.map((mid, i) => {
                                    const mName = models.find(m => m.id === mid)?.name || mid;
                                    return (
                                        <Radar key={mid} name={mName} dataKey={mName} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.3} />
                                    );
                                })}
                                <Legend />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-slate-400 mt-20">{t('res.radarNoData')}</p>}
                </div>

                {/* Bar Chart - Latency */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm min-h-[400px]">
                     <h3 className="text-lg font-semibold mb-4 text-center">{t('res.latencyTitle')}</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={aggregations}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey={t('res.latencyTitle')} fill="#8884d8" />
                        </BarChart>
                     </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-900">{t('res.logsTitle')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.id')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.model')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.input')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.scores')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('res.col.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {(selectedRun.results || []).map((res, idx) => (
                                <React.Fragment key={idx}>
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {res.itemId.slice(0, 6)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {models.find(m => m.id === res.modelId)?.name || res.modelId}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                                            {res.input?.substring(0, 50) || 'No input'}...
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {Object.entries(res.scores).map(([k, v]) => (
                                                <span key={k} className="mr-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    {t(`metric.${k}`) || k}: {typeof v === 'number' ? v.toFixed(2) : v.toString()}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button 
                                                onClick={() => {
                                                  setSelectedResult(res);
                                                  setShowResultModal(true);
                                                }}
                                                className="text-primary hover:text-blue-900 mr-2"
                                            >
                                                {t('res.viewDetails')}
                                            </button>
                                            <button 
                                                onClick={() => setExpandedItem(expandedItem === idx.toString() ? null : idx.toString())}
                                                className="text-slate-500 hover:text-slate-700"
                                            >
                                                {expandedItem === idx.toString() ? t('res.collapse') : '展开'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedItem === idx.toString() && (
                                        <tr className="bg-slate-50">
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="font-bold text-xs text-slate-500 uppercase mb-1">{t('res.input')}</h4>
                                                        <pre className="bg-white p-2 rounded border text-xs text-slate-700 whitespace-pre-wrap">{res.input}</pre>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-xs text-slate-500 uppercase mb-1">{t('res.reference')}</h4>
                                                        <pre className="bg-white p-2 rounded border text-xs text-slate-700 whitespace-pre-wrap">{res.reference || "N/A"}</pre>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <h4 className="font-bold text-xs text-slate-500 uppercase mb-1">{t('res.output')}</h4>
                                                        <pre className="bg-white p-2 rounded border border-blue-200 text-xs text-slate-900 whitespace-pre-wrap">{res.output}</pre>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Detailed Result Modal */}
      {showResultModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">评测详情 - {selectedResult.itemId}</h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">{t('res.col.model')}</h4>
                    <p className="text-slate-900">{models.find(m => m.id === selectedResult.modelId)?.name || selectedResult.modelId}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">{t('res.input')}</h4>
                    <div className="bg-slate-50 p-3 rounded border text-sm text-slate-800 whitespace-pre-wrap">
                      {selectedResult.input}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">{t('res.reference')}</h4>
                    <div className="bg-slate-50 p-3 rounded border text-sm text-slate-800 whitespace-pre-wrap">
                      {selectedResult.reference || '无参考答案'}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">{t('res.output')}</h4>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-slate-900 whitespace-pre-wrap">
                      {selectedResult.output}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">{t('res.col.scores')}</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedResult.scores).map(([metric, score]) => (
                        <div key={metric} className="flex justify-between items-center p-2 bg-green-50 rounded border">
                          <span className="text-sm font-medium text-slate-700">{t(`metric.${metric}`) || metric}</span>
                          <span className="text-sm font-bold text-green-700">
                            {typeof score === 'number' ? score.toFixed(3) : score.toString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">性能指标</h4>
                    <div className="p-2 bg-purple-50 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">延迟</span>
                        <span className="text-sm font-bold text-purple-700">{selectedResult.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowResultModal(false)}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};