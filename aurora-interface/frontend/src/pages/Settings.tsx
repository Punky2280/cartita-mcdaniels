import React, { useState } from 'react';
import {
  Cog6ToothIcon,
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  ComputerDesktopIcon,
  ServerIcon,
  KeyIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, icon: Icon, children }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white border border-gray-200">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, label, description }) => (
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <label className="text-sm font-medium text-gray-900">{label}</label>
      {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
        enabled ? 'bg-orange-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    // Profile
    name: 'Aurora User',
    email: 'user@aurora-interface.com',
    avatar: '',

    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    workflowNotifications: true,
    errorNotifications: true,

    // Appearance
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',

    // Privacy & Security
    twoFactorAuth: false,
    sessionTimeout: 30,
    auditLogging: true,

    // AI & Agents
    defaultModel: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7,
    autoEnhance: true,

    // System
    autoUpdates: true,
    telemetry: true,
    debugMode: false
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    console.log('Saving settings:', settings);
    setUnsavedChanges(false);
  };

  const handleReset = () => {
    console.log('Resetting settings to defaults');
    setUnsavedChanges(false);
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aurora-settings.json';
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700">
              <Cog6ToothIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">
            Configure your Aurora Interface preferences and system settings
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Unsaved changes
            </div>
          )}
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
              unsavedChanges
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!unsavedChanges}
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      <SettingsSection
        title="Profile"
        description="Manage your personal information and preferences"
        icon={UserIcon}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center">
              <UserIcon className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                Change Avatar
              </button>
              <p className="text-sm text-gray-600 mt-1">JPG, PNG, or GIF. Max size 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => updateSetting('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Control how and when you receive notifications"
        icon={BellIcon}
      >
        <div className="space-y-6">
          <ToggleSwitch
            enabled={settings.emailNotifications}
            onChange={(value) => updateSetting('emailNotifications', value)}
            label="Email Notifications"
            description="Receive notifications via email for important updates"
          />

          <ToggleSwitch
            enabled={settings.pushNotifications}
            onChange={(value) => updateSetting('pushNotifications', value)}
            label="Push Notifications"
            description="Show browser notifications for real-time updates"
          />

          <ToggleSwitch
            enabled={settings.workflowNotifications}
            onChange={(value) => updateSetting('workflowNotifications', value)}
            label="Workflow Notifications"
            description="Get notified when workflows complete or fail"
          />

          <ToggleSwitch
            enabled={settings.errorNotifications}
            onChange={(value) => updateSetting('errorNotifications', value)}
            label="Error Notifications"
            description="Receive alerts for system errors and failures"
          />
        </div>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel of the interface"
        icon={PaintBrushIcon}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => updateSetting('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => updateSetting('dateFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Privacy & Security */}
      <SettingsSection
        title="Privacy & Security"
        description="Manage your security settings and privacy preferences"
        icon={ShieldCheckIcon}
      >
        <div className="space-y-6">
          <ToggleSwitch
            enabled={settings.twoFactorAuth}
            onChange={(value) => updateSetting('twoFactorAuth', value)}
            label="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
            <select
              value={settings.sessionTimeout}
              onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={480}>8 hours</option>
            </select>
          </div>

          <ToggleSwitch
            enabled={settings.auditLogging}
            onChange={(value) => updateSetting('auditLogging', value)}
            label="Audit Logging"
            description="Log all user actions for security and compliance"
          />

          {/* API Keys */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">API Keys</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <KeyIcon className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">OpenAI API Key</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-gray-600 font-mono">
                      {showApiKey ? 'sk-1234567890abcdef...' : '••••••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button className="text-red-600 hover:text-red-700">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* AI & Agent Settings */}
      <SettingsSection
        title="AI & Agents"
        description="Configure AI model preferences and agent behavior"
        icon={SparklesIcon}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default AI Model</label>
              <select
                value={settings.defaultModel}
                onChange={(e) => updateSetting('defaultModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude 3</option>
                <option value="claude-2">Claude 2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
              <input
                type="number"
                value={settings.maxTokens}
                onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                min="100"
                max="8000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
              <input
                type="range"
                value={settings.temperature}
                onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                min="0"
                max="2"
                step="0.1"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Focused (0.0)</span>
                <span>{settings.temperature.toFixed(1)}</span>
                <span>Creative (2.0)</span>
              </div>
            </div>
          </div>

          <ToggleSwitch
            enabled={settings.autoEnhance}
            onChange={(value) => updateSetting('autoEnhance', value)}
            label="Auto-enhance with Context7"
            description="Automatically enhance documentation and code with AI insights"
          />
        </div>
      </SettingsSection>

      {/* System Settings */}
      <SettingsSection
        title="System"
        description="System-level preferences and maintenance options"
        icon={ComputerDesktopIcon}
      >
        <div className="space-y-6">
          <ToggleSwitch
            enabled={settings.autoUpdates}
            onChange={(value) => updateSetting('autoUpdates', value)}
            label="Automatic Updates"
            description="Automatically install system updates and patches"
          />

          <ToggleSwitch
            enabled={settings.telemetry}
            onChange={(value) => updateSetting('telemetry', value)}
            label="Usage Analytics"
            description="Help improve Aurora by sharing anonymous usage data"
          />

          <ToggleSwitch
            enabled={settings.debugMode}
            onChange={(value) => updateSetting('debugMode', value)}
            label="Debug Mode"
            description="Enable detailed logging for troubleshooting"
          />

          {/* Data Management */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Data Management</h3>
            <div className="flex gap-3">
              <button
                onClick={handleExportSettings}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export Settings
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Import Settings
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors">
                <TrashIcon className="h-4 w-4 mr-2" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* System Info */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="font-medium text-gray-700">Version:</span>
            <span className="text-gray-600 ml-2">Aurora Interface v3.2.1</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Environment:</span>
            <span className="text-gray-600 ml-2">Production</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="text-gray-600 ml-2">2 days ago</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Active Agents:</span>
            <span className="text-gray-600 ml-2">8</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">MCP Servers:</span>
            <span className="text-gray-600 ml-2">7 online, 1 degraded</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Uptime:</span>
            <span className="text-gray-600 ml-2">4d 12h 23m</span>
          </div>
        </div>
      </div>
    </div>
  );
};