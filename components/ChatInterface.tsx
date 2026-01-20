import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check, Loader2, AlertTriangle } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message } from '../types';
import { SYSTEM_INSTRUCTION, MODEL_TEXT } from '../constants';

interface ChatInterfaceProps {
  apiKey: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ apiKey }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Mingalaba! I am your Japanese-to-Burmese subtitle translator. Send me Japanese text or upload a script, and I will format it into .SRT subtitles.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Prevent sending if no key is present (though UI should block this via modal)
    if (!apiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Error: No API key found. Please configure it in Settings.",
        timestamp: Date.now()
      }]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Filter out the welcome message (id: 'welcome') from the history sent to API
      // to ensure the conversation starts with a User message or is empty (valid for API).
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const chat = ai.chats.create({
        model: MODEL_TEXT,
        history: history,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const resultStream = await chat.sendMessageStream({ message: userMsg.text });
      
      let fullText = '';
      let hasAddedMessage = false;
      const modelMsgId = (Date.now() + 1).toString();

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        const text = c.text || '';
        fullText += text;

        if (!hasAddedMessage) {
          hasAddedMessage = true;
          setMessages(prev => [...prev, {
            id: modelMsgId,
            role: 'model',
            text: fullText,
            timestamp: Date.now(),
            isPartial: true
          }]);
        } else {
          setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
              ? { ...msg, text: fullText }
              : msg
          ));
        }
      }

      // Mark as complete
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { ...msg, isPartial: false }
          : msg
      ));

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      let errorMessage = "Failed to connect to Gemini.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error.message) {
         errorMessage = error.message;
      } else {
         errorMessage = String(error);
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Error: ${errorMessage}\n\nPlease check your configuration.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>

              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`p-4 rounded-2xl shadow-md whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : msg.text.startsWith('Error:') 
                        ? 'bg-red-900/50 border border-red-500 text-red-100 rounded-tl-none'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}
                >
                  {msg.role === 'model' && !msg.isPartial && !msg.text.startsWith('Error:') && (
                    <div className="flex justify-end mb-2">
                      <button 
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copy SRT"
                      >
                        {copiedId === msg.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  <span className={msg.role === 'model' ? 'font-mono text-sm' : 'text-base'}>
                     {msg.text.startsWith('Error:') && <AlertTriangle className="inline-block w-4 h-4 mr-2 mb-1" />}
                     {msg.text}
                     {msg.isPartial && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />}
                  </span>
                </div>
                <span className="text-xs text-slate-500 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start w-full">
            <div className="flex gap-3 max-w-[70%]">
               <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
               </div>
               <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-2">
                 <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                 <span className="text-sm text-slate-400">Translating...</span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto relative flex items-center gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Enter Japanese text..."
              disabled={isLoading || !apiKey}
              className="w-full bg-slate-800 text-white placeholder-slate-400 rounded-xl pl-4 pr-12 py-3 border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-[52px] scrollbar-hide disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !apiKey}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-all shadow-lg hover:shadow-indigo-500/20"
          >
             <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;