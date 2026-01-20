import React, { useState, useEffect } from 'react';
import { Settings, X, Save, Key, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, setApiKey }) => {
  const [inputValue, setInputValue] = useState(apiKey);

  useEffect(() => {
    setInputValue(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    const trimmedKey = inputValue.trim();
    if (trimmedKey) {
      setApiKey(trimmedKey);
      localStorage.setItem('gemini_api_key', trimmedKey);
      onClose();
    }
  };

  const handleClose = () => {
    // Only allow closing if there is a valid key already saved (parent component handles the logic via onClose callback, 
    // but we can add visual feedback or blocking here if needed)
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            API Configuration
          </h2>
          {apiKey && (
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
              Gemini API Key
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20"
              >
                Get Key <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="password"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Paste your key here (starts with AIza...)"
                className="block w-full pl-10 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500 sm:text-sm transition-all"
              />
            </div>
            {!apiKey && (
              <p className="mt-3 text-xs text-amber-400 flex items-start gap-1.5">
                <span className="mt-0.5 block w-1 h-1 rounded-full bg-amber-400 shrink-0"></span>
                An API key is required to use the translation features.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Your key is stored securely in your browser's local storage and is never sent to our servers.
            </p>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={handleSave}
            disabled={!inputValue.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {apiKey ? 'Update Configuration' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;