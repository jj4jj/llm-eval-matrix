
import React, { useState } from 'react';
import { useAppStore } from '../context/AppContext';
import { PRESETS_MODELS } from '../constants';
import { fetchModelList } from '../services/llm';
import { v4 as uuidv4 } from 'uuid';
import { LLMModel } from '../types';

export const Models: React.FC = () => {
  const { models, addModel, removeModel, t } = useAppStore();
  const [newModel, setNewModel] = useState<Partial<LLMModel>>({
    provider: 'openrouter',
    baseUrl: PRESETS_MODELS[0].baseUrl
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    const preset = PRESETS_MODELS.find(p => p.provider === provider);
    if (preset) {
      setNewModel(prev => ({ ...prev, provider: preset.provider as any, baseUrl: preset.baseUrl }));
    }
  };

  const fetchModels = async () => {
    if (!newModel.baseUrl || !newModel.apiKey) {
        alert(t('models.validationError'));
        return;
    }
    setIsLoadingList(true);
    try {
        const list = await fetchModelList(newModel.baseUrl, newModel.apiKey);
        setAvailableModels(list.map((m: any) => m.id));
    } catch (e) {
        alert("Failed to fetch models. Ensure CORS is enabled on the server or use OpenRouter.");
    } finally {
        setIsLoadingList(false);
    }
  };

  const handleAddModel = () => {
    // Auto-fill Display Name if empty but Model ID exists
    const displayName = newModel.name?.trim() || newModel.modelId;

    if (!displayName || !newModel.apiKey || !newModel.modelId || !newModel.baseUrl) {
        alert(t('models.validationError'));
        return;
    }

    addModel({
        id: uuidv4(),
        name: displayName,
        provider: newModel.provider as any,
        baseUrl: newModel.baseUrl,
        apiKey: newModel.apiKey,
        modelId: newModel.modelId
    });
    
    // Provide visual feedback or simply clear the relevant fields
    // We preserve BaseURL and API Key for convenience when adding multiple models from same provider
    setNewModel(prev => ({ ...prev, name: '', modelId: '' })); 
    // Optional: alert(t('models.saved'));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">{t('models.title')}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Model Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-fit sticky top-24">
            <h2 className="text-lg font-semibold mb-4">{t('models.addTitle')}</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">{t('models.preset')}</label>
                    <select 
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border"
                        value={newModel.provider}
                        onChange={handlePresetChange}
                    >
                        {PRESETS_MODELS.map(p => <option key={p.provider} value={p.provider}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">{t('models.baseUrl')}</label>
                    <input 
                        type="text" 
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border"
                        value={newModel.baseUrl || ''}
                        onChange={e => setNewModel({...newModel, baseUrl: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">{t('models.apiKey')}</label>
                    <input 
                        type="password" 
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border"
                        value={newModel.apiKey || ''}
                        onChange={e => setNewModel({...newModel, apiKey: e.target.value})}
                        placeholder="sk-..."
                    />
                </div>
                
                <div className="flex gap-2">
                     <button 
                        onClick={fetchModels}
                        disabled={isLoadingList}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded text-sm font-medium transition"
                    >
                        {isLoadingList ? t('models.fetching') : t('models.fetch')}
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">{t('models.selectId')}</label>
                    {availableModels.length > 0 ? (
                        <select 
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            value={newModel.modelId || ''}
                            onChange={e => setNewModel({...newModel, modelId: e.target.value})}
                        >
                             <option value="">{t('models.selectPlaceholder')}</option>
                             {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    ) : (
                         <input 
                            type="text" 
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border"
                            value={newModel.modelId || ''}
                            onChange={e => setNewModel({...newModel, modelId: e.target.value})}
                            placeholder={t('models.manualPlaceholder')}
                        />
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">{t('models.displayName')}</label>
                    <input 
                        type="text" 
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border"
                        value={newModel.name || ''}
                        onChange={e => setNewModel({...newModel, name: e.target.value})}
                        placeholder={t('models.namePlaceholder')}
                    />
                    <p className="text-xs text-slate-400 mt-1">Optional. Defaults to Model ID.</p>
                </div>

                <button 
                    onClick={handleAddModel}
                    className="w-full bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded font-bold transition"
                >
                    {t('models.saveBtn')}
                </button>
            </div>
        </div>

        {/* Model List */}
        <div className="lg:col-span-2 space-y-4">
            {models.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                    <p className="text-slate-400">{t('models.noModels')}</p>
                </div>
            ) : (
                models.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{m.name}</h3>
                            <div className="text-sm text-slate-500 space-y-1">
                                <p><span className="font-semibold">ID:</span> {m.modelId}</p>
                                <p><span className="font-semibold">Provider:</span> {m.provider}</p>
                                <p className="text-xs text-slate-400 truncate max-w-md">{m.baseUrl}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => removeModel(m.id)}
                            className="text-red-500 hover:text-red-700 p-2"
                        >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};