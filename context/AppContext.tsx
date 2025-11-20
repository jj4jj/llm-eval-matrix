import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dataset, LLMModel, EvaluationRun } from '../types';
import { translations, Language } from '../translations';
import { apiService } from '../services/api';

interface AppState {
  datasets: Dataset[];
  models: LLMModel[];
  runs: EvaluationRun[];
  isLoading: boolean;
  isBackendConnected: boolean;
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
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Check health
        const healthy = await apiService.healthCheck();
        setIsBackendConnected(healthy);

        if (healthy) {
            // Load from Backend
            const [d, m, r] = await Promise.all([
                apiService.getDatasets(),
                apiService.getModels(),
                apiService.getRuns()
            ]);
            setDatasets(d);
            setModels(m);
            setRuns(r);
        } else {
            console.warn("Backend not reachable, falling back to localStorage (ReadOnly mode recommended)");
            // Fallback logic (Keep existing LS logic for fallback)
            const lsD = localStorage.getItem('datasets');
            const lsM = localStorage.getItem('models');
            const lsR = localStorage.getItem('runs');
            if (lsD) setDatasets(JSON.parse(lsD));
            if (lsM) setModels(JSON.parse(lsM));
            if (lsR) setRuns(JSON.parse(lsR));
        }
      } catch (e) {
        console.error("Initialization error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language]?.[key] || key;
  };

  // --- Actions (Optimistic updates + API calls) ---

  const addDataset = (ds: Dataset) => {
    setDatasets(prev => [ds, ...prev]);
    if (isBackendConnected) {
        apiService.addDataset(ds).catch(err => {
            console.error(err);
            // Rollback could go here
        });
    } else {
        localStorage.setItem('datasets', JSON.stringify([ds, ...datasets]));
    }
  };

  const addModel = (m: LLMModel) => {
    setModels(prev => [m, ...prev]);
    if (isBackendConnected) {
        apiService.addModel(m).catch(err => console.error(err));
    } else {
        localStorage.setItem('models', JSON.stringify([m, ...models]));
    }
  };

  const removeModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
    if (isBackendConnected) {
        apiService.deleteModel(id).catch(err => console.error(err));
    } else {
        const newModels = models.filter(m => m.id !== id);
        localStorage.setItem('models', JSON.stringify(newModels));
    }
  };
  
  const addRun = (run: EvaluationRun) => {
    setRuns(prev => [run, ...prev]);
    if (isBackendConnected) {
        apiService.addRun(run).catch(err => console.error(err));
    } else {
        localStorage.setItem('runs', JSON.stringify([run, ...runs]));
    }
  };

  const updateRun = (id: string, updates: Partial<EvaluationRun>) => {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    // Debounce or selective save could improve performance for frequent updates (progress)
    // For now, we save every update to ensure persistence
    if (isBackendConnected) {
        apiService.updateRun(id, updates).catch(err => console.error(err));
    } else {
        const newRuns = runs.map(r => r.id === id ? { ...r, ...updates } : r);
        localStorage.setItem('runs', JSON.stringify(newRuns));
    }
  };

  return (
    <AppContext.Provider value={{ 
        datasets, models, runs, isLoading, isBackendConnected,
        addDataset, addModel, removeModel, addRun, updateRun, 
        language, setLanguage, t 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};
