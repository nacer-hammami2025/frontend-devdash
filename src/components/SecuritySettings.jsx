import React, { useState } from 'react';
import TwoFactorSetup from './SecuritySettings/TwoFactorSetup';
import ActiveSessions from './SecuritySettings/ActiveSessions';
import AuditLog from './SecuritySettings/AuditLog';

export default function SecuritySettings() {
  const [activeTab, setActiveTab] = useState('2fa');

  const tabs = [
    { id: '2fa', label: '2FA Setup' },
    { id: 'sessions', label: 'Active Sessions' },
    { id: 'audit', label: 'Security Log' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Security Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-6 text-center border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="py-4">
        {activeTab === '2fa' && <TwoFactorSetup />}
        {activeTab === 'sessions' && <ActiveSessions />}
        {activeTab === 'audit' && <AuditLog />}
      </div>
    </div>
  );
}
