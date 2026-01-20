import React, { useState } from 'react';
import { MessageSquare, Radio, Menu, AlertTriangle } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Initialize API key exclusively from environment variable.
  // The application must not ask the user for the key.
  const apiKey = process.env.API_KEY || '';

  const toggleMode = (newMode: AppMode) => {
    setMode(newMode);
    setIsMobileMenuOpen(false);
  };

  // Strict check: If no API key is present in the environment, show configuration error.
  if (!apiKey) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-900/20 rounded-3xl border border-red-500/30 flex items-center justify-center mb-6 shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Configuration Error</h1>
        <p className="text-slate-400 max-w-md text-lg leading-relaxed">
          The <code className="bg-slate-900 px-2 py-1 rounded text-slate-200 font-mono text-sm border border-slate-800">API_KEY</code> environment variable is missing.
        </p>
        <p className="text-slate-500 mt-4 text-sm">
          Please configure your environment variables to use the application.
        </p>
      </div>
    );
  }

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
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">JP</span>
          </div>
          <h1 className="text-lg font-bold text-white">JP-MM Translator</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="text-white p-2"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
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
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-950">
        {mode === AppMode.CHAT ? (
          <ChatInterface apiKey={apiKey} />
        ) : (
          <LiveInterface apiKey={apiKey} />
        )}
      </div>
    </div>
  );
};

export default App;