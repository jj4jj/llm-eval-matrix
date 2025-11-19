import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { t, language, setLanguage } = useAppStore();
  
  const navItems = [
    { key: 'nav.dashboard', path: '/' },
    { key: 'nav.datasets', path: '/datasets' },
    { key: 'nav.models', path: '/models' },
    { key: 'nav.evaluate', path: '/evaluate' },
    { key: 'nav.results', path: '/results' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl text-primary tracking-tight">EvalMatrix</span>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${
                    location.pathname === item.path
                      ? 'border-primary text-slate-900'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`}
                >
                  {t(item.key)}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
             <button 
                onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 px-3 py-1 rounded hover:bg-slate-100 transition"
             >
                {language === 'en' ? '中文' : 'English'}
             </button>
          </div>
        </div>
      </div>
    </nav>
  );
};