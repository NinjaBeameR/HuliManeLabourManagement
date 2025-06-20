import React, { useState } from 'react';
import { Users, Tag } from 'lucide-react';
import WorkerManagement from './WorkerManagement';
import CategoryManagement from './CategoryManagement';

export default function MasterModule() {
  const [activeTab, setActiveTab] = useState<'workers' | 'categories'>('workers');

  const tabs = [
    { id: 'workers' as const, label: 'Workers', icon: Users },
    { id: 'categories' as const, label: 'Categories', icon: Tag },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'workers' && <WorkerManagement />}
        {activeTab === 'categories' && <CategoryManagement />}
      </div>
    </div>
  );
}