import React, { useState, useEffect } from 'react';
import { MessageSquare, Radio, Settings, Menu } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import SettingsModal from './components/SettingsModal';
import { AppMode } from './types';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setIsSettingsOpen(true);
    }
  }, []);

  const toggleMode = (newMode: AppMode) => {
    setMode(newMode);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-950">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900 p-4">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">JP</span>
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">JP-MM Translator</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => toggleMode(AppMode.CHAT)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              mode === AppMode.CHAT
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Text Translator</span>
          </button>
          
          <button
            onClick={() => toggleMode(AppMode.LIVE)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              mode === AppMode.LIVE
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span className="font-medium">Live Voice</span>
            <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-semibold border border-indigo-500/30">
              BETA
            </span>
          </button>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">JP</span>
          </div>
          <h1 className="text-lg font-bold text-white">JP-MM Translator</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900 border-b border-slate-800 z-50 p-4 space-y-2 shadow-xl">
           <button
            onClick={() => toggleMode(AppMode.CHAT)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
              mode === AppMode.CHAT ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Text Translator
          </button>
          <button
            onClick={() => toggleMode(AppMode.LIVE)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
              mode === AppMode.LIVE ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Radio className="w-5 h-5" />
            Live Voice
          </button>
          <button
            onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-950">
        {mode === AppMode.CHAT ? (
          <ChatInterface apiKey={apiKey} onOpenSettings={() => setIsSettingsOpen(true)} />
        ) : (
          <LiveInterface apiKey={apiKey} onOpenSettings={() => setIsSettingsOpen(true)} />
        )}
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
    </div>
  );
};

export default App;
