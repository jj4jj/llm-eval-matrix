import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dataset, LLMModel, EvaluationRun, EvaluationConfig } from '../types';
import { translations, Language } from '../translations';

interface AppState {
  datasets: Dataset[];
  models: LLMModel[];
  runs: EvaluationRun[];
  addDataset: (ds: Dataset) => void;
  addModel: (m: LLMModel) => void;
  removeModel: (id: string) => void;
  addRun: (run: EvaluationRun) => void;
  updateRun: (id: string, updates: Partial<EvaluationRun>) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>(() => {
    const saved = localStorage.getItem('datasets');
    return saved ? JSON.parse(saved) : [];
  });

  const [models, setModels] = useState<LLMModel[]>(() => {
    const saved = localStorage.getItem('models');
    return saved ? JSON.parse(saved) : [];
  });

  const [runs, setRuns] = useState<EvaluationRun[]>(() => {
    const saved = localStorage.getItem('runs');
    return saved ? JSON.parse(saved) : [];
  });

  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  // Persistence
  useEffect(() => { localStorage.setItem('datasets', JSON.stringify(datasets)); }, [datasets]);
  useEffect(() => { localStorage.setItem('models', JSON.stringify(models)); }, [models]);
  useEffect(() => { localStorage.setItem('runs', JSON.stringify(runs)); }, [runs]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  const addDataset = (ds: Dataset) => setDatasets(prev => [ds, ...prev]);
  const addModel = (m: LLMModel) => setModels(prev => [m, ...prev]);
  const removeModel = (id: string) => setModels(prev => prev.filter(m => m.id !== id));
  
  const addRun = (run: EvaluationRun) => setRuns(prev => [run, ...prev]);
  const updateRun = (id: string, updates: Partial<EvaluationRun>) => {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <AppContext.Provider value={{ datasets, models, runs, addDataset, addModel, removeModel, addRun, updateRun, language, setLanguage, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};