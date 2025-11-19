import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/AppContext';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MetricType } from '../types';
import { METRIC_LABELS } from '../constants';

export const Results: React.FC = () => {
  const { runs, models, datasets, t } = useAppStore();
  const [selectedRunId, setSelectedRunId] = useState<string>(runs.length > 0 ? runs[0].id : '');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const selectedRun = runs.find(r => r.id === selectedRunId);
  const dataset = datasets.find(d => d.id === selectedRun?.configSnapshot.datasetId);

  // Data Processing for Charts
  const aggregations = useMemo(() => {
    if (!selectedRun) return [];
    
    const modelStats: Record<string, any> = {};
    
    // Initialize
    selectedRun.configSnapshot.modelIds.forEach(mid => {
        const mName = models.find(m => m.id === mid)?.name || mid;
        modelStats[mid] = { 
            name: mName, 
            latencyTotal: 0, 
            count: 0,
            ...Object.fromEntries(selectedRun.configSnapshot.metrics.map(m => [m, 0])) 
        };
    });

    selectedRun.results.forEach(res => {
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
        selectedRun.configSnapshot.metrics.forEach(m => {
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
    const metrics = selectedRun.configSnapshot.metrics.filter(m => m !== MetricType.LENGTH);
    
    return metrics.map(m => {
        const obj: any = { subject: t(`metric.${m}`) };
        aggregations.forEach((agg: any) => {
            obj[agg.name] = parseFloat(agg[t(`metric.${m}`)]);
        });
        return obj;
    });
  }, [aggregations, selectedRun, t]);

  const colors = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#9333ea'];

  if (runs.length === 0) {
    return <div className="p-8 text-center text-slate-500">{t('res.noRuns')}</div>;
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
                    {r.configSnapshot.name} - {new Date(r.timestamp).toLocaleString()} ({r.status})
                </option>
            ))}
        </select>
      </div>

      {selectedRun && (
        <div className="space-y-8">
            {/* Status Bar */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700">{t('res.progress')}</span>
                    <span className="text-sm text-slate-500">{selectedRun.progress} / {selectedRun.total} {t('res.itemsProcessed')}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${(selectedRun.progress / selectedRun.total) * 100}%` }}
                    ></div>
                </div>
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
                            {selectedRun.results.map((res, idx) => (
                                <React.Fragment key={idx}>
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {res.itemId.slice(0, 6)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {models.find(m => m.id === res.modelId)?.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                                            {res.input.substring(0, 50)}...
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
                                                onClick={() => setExpandedItem(expandedItem === idx.toString() ? null : idx.toString())}
                                                className="text-primary hover:text-blue-900"
                                            >
                                                {expandedItem === idx.toString() ? t('res.collapse') : t('res.viewDetails')}
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
    </div>
  );
};