import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const { datasets, models, runs, t } = useAppStore();

  const stats = [
    { name: t('dash.stats.datasets'), value: datasets.length, link: '/datasets', color: 'bg-blue-500' },
    { name: t('dash.stats.models'), value: models.length, link: '/models', color: 'bg-green-500' },
    { name: t('dash.stats.runs'), value: runs.length, link: '/results', color: 'bg-purple-500' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="text-center py-12">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
          {t('dash.title')}
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-500">
          {t('dash.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8">
        {stats.map((stat) => (
          <Link to={stat.link} key={stat.name} className="group block">
            <div className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition duration-200 border border-slate-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                     <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-slate-500">{stat.name}</dt>
                      <dd>
                        <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-5 py-3">
                <div className="text-sm text-slate-500 group-hover:text-slate-700 font-medium">
                  {t('dash.viewDetails')}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{t('dash.quickStart')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center mb-2">
                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mr-2">Step 1</div>
                    <h3 className="font-bold">{t('dash.step1')}</h3>
                </div>
                <p className="text-slate-600 text-sm mb-4">{t('dash.step1.desc')}</p>
                <Link to="/models" className="text-primary text-sm font-semibold hover:underline">{t('dash.step1.link')}</Link>
            </div>
            <div className="p-6 border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center mb-2">
                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mr-2">Step 2</div>
                    <h3 className="font-bold">{t('dash.step2')}</h3>
                </div>
                <p className="text-slate-600 text-sm mb-4">{t('dash.step2.desc')}</p>
                <Link to="/datasets" className="text-primary text-sm font-semibold hover:underline">{t('dash.step2.link')}</Link>
            </div>
            <div className="p-6 border border-slate-200 rounded-lg bg-white md:col-span-2 border-l-4 border-l-primary">
                <div className="flex items-center mb-2">
                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mr-2">Step 3</div>
                    <h3 className="font-bold">{t('dash.step3')}</h3>
                </div>
                <p className="text-slate-600 text-sm mb-4">{t('dash.step3.desc')}</p>
                <Link to="/evaluate" className="bg-primary text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition">{t('dash.step3.btn')}</Link>
            </div>
        </div>
      </div>
    </div>
  );
};