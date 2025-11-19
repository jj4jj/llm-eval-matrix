
import React, { useState, useRef } from 'react';
import { useAppStore } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { SAMPLE_DATASET_CONTENT } from '../constants';
import { InfoTooltip } from '../components/InfoTooltip';

export const Datasets: React.FC = () => {
  const { datasets, addDataset, t } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Handle JSONL
        const lines = text.trim().split('\n');
        const items = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(item => item !== null && (item.input || item.prompt)); // Basic validation

        if (items.length === 0) throw new Error("No valid JSON items found.");

        const normalizedItems = items.map(item => ({
            id: uuidv4(),
            input: item.input || item.prompt || item.question, // Flexible key mapping
            reference: item.reference || item.output || item.completion || item.answer,
            ...item
        }));

        addDataset({
          id: uuidv4(),
          name: file.name.replace('.jsonl', '').replace('.json', ''),
          createdAt: new Date().toISOString(),
          items: normalizedItems,
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        alert(`Error parsing file: ${err}`);
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.readAsText(file);
  };

  const downloadSample = () => {
    // Use Data URI scheme to avoid Blob/Object URL security restrictions in sandboxed iframes
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(SAMPLE_DATASET_CONTENT);
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'sample_dataset.jsonl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                {t('ds.title')}
                <InfoTooltip content={t('ds.infoContent')} />
            </h1>
            <p className="text-slate-500">{t('ds.subtitle')}</p>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={downloadSample}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2 px-4 rounded inline-flex items-center transition"
            >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                {t('ds.downloadSample')}
            </button>

            <div className="relative">
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".jsonl,.json"
                    className="hidden"
                    onChange={handleFileUpload}
                    id="dataset-upload"
                />
                <label
                    htmlFor="dataset-upload"
                    className={`cursor-pointer bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition ${isUploading ? 'opacity-50' : ''}`}
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    {isUploading ? t('ds.processing') : t('ds.uploadBtn')}
                </label>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {datasets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-slate-400">{t('ds.noDatasets')}</p>
            </div>
        ) : (
            datasets.map(ds => (
                <div key={ds.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{ds.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">{t('ds.created')}: {new Date(ds.createdAt).toLocaleString()}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {ds.items.length} {t('ds.items')}
                        </span>
                    </div>
                    <div className="mt-4 bg-slate-50 p-3 rounded text-xs font-mono text-slate-600 overflow-hidden whitespace-nowrap text-ellipsis">
                        {t('ds.preview')}: {JSON.stringify(ds.items[0]).substring(0, 100)}...
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};
