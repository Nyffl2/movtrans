import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Activity, AlertCircle, Waves } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION, MODEL_LIVE, INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from '../constants';
import { decodeAudioData, float32ToInt16, base64ToUint8Array, uint8ArrayToBase64 } from '../utils/audio';

interface LiveInterfaceProps {
  apiKey: string;
  onOpenSettings: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ apiKey, onOpenSettings }) => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback Refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Connection Ref
  const sessionRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    // Stop all audio sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    // Disconnect script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Disconnect input source
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }

    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close contexts
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }

    // Close Session - we can't explicitly close the session object easily if it doesn't expose close, 
    // but stopping the stream essentially kills the flow. 
    // The library docs say session.close() exists.
    if (sessionRef.current) {
      // sessionRef.current.close(); // Check if available on the promise wrapper? 
      // Actually we just drop the reference and let garbage collection handle it, 
      // or rely on the `onclose` callback handling if the server kills it.
      // But we should try to close if possible.
      // Since ai.live.connect returns a promise that resolves to a session, we need to store the resolved session.
    }
    
    setIsActive(false);
    setStatus('idle');
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    setStatus('connecting');
    setErrorMessage('');

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE
      });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE
      });

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: MODEL_LIVE,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setStatus('connected');
            setIsActive(true);

            // Setup Input Pipeline (Mic -> Processor -> Gemini)
            if (!inputContextRef.current || !streamRef.current) return;

            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = source;
            
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (isMuted) return; // Don't send if muted
              
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16 PCM
              const pcmData = float32ToInt16(inputData);
              // Convert to Uint8 for base64
              const uint8Data = new Uint8Array(pcmData.buffer);
              const base64Data = uint8ArrayToBase64(uint8Data);

              sessionPromise.then(session => {
                  sessionRef.current = session;
                  session.sendRealtimeInput({
                      media: {
                          mimeType: 'audio/pcm;rate=16000',
                          data: base64Data
                      }
                  });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Audio Output
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData && outputContextRef.current) {
                 const ctx = outputContextRef.current;
                 const uint8Bytes = base64ToUint8Array(audioData);
                 const audioBuffer = decodeAudioData(uint8Bytes, ctx, OUTPUT_SAMPLE_RATE);
                 
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 const gainNode = ctx.createGain();
                 gainNode.gain.value = 1.0; // Volume

                 source.connect(gainNode);
                 gainNode.connect(ctx.destination);

                 // Schedule playback
                 const currentTime = ctx.currentTime;
                 if (nextStartTimeRef.current < currentTime) {
                     nextStartTimeRef.current = currentTime;
                 }
                 
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 
                 sourcesRef.current.add(source);
                 source.onended = () => {
                     sourcesRef.current.delete(source);
                 };
             }

             // Handle Interruption
             if (msg.serverContent?.interrupted) {
                 console.log('Interrupted');
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
             console.log('Gemini Live Closed');
             cleanup();
          },
          onerror: (err) => {
             console.error('Gemini Live Error', err);
             setErrorMessage("Connection Error");
             setStatus('error');
             cleanup();
          }
        }
      });

    } catch (err: any) {
        console.error("Failed to start session", err);
        setErrorMessage(err.message || "Failed to access microphone or connect.");
        setStatus('error');
        cleanup();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 items-center justify-center relative overflow-hidden">
      {/* Background Pulse Animation */}
      {status === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="w-96 h-96 bg-indigo-600/20 rounded-full animate-ping opacity-20"></div>
           <div className="absolute w-64 h-64 bg-indigo-500/10 rounded-full animate-pulse"></div>
        </div>
      )}

      {/* Main Status Display */}
      <div className="z-10 text-center space-y-8">
        <div className="relative">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
            status === 'connected' 
              ? 'bg-indigo-600 shadow-[0_0_50px_rgba(79,70,229,0.5)]' 
              : status === 'error' ? 'bg-red-500/20 border-2 border-red-500' 
              : 'bg-slate-800 border border-slate-700'
          }`}>
             {status === 'connected' ? (
                <Waves className="w-16 h-16 text-white animate-pulse" />
             ) : status === 'error' ? (
                <AlertCircle className="w-16 h-16 text-red-500" />
             ) : (
                <Activity className="w-16 h-16 text-slate-500" />
             )}
          </div>
          {status === 'connected' && (
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-950 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
            </div>
          )}
        </div>

        <div className="space-y-2">
           <h2 className="text-2xl font-semibold text-white">
             {status === 'idle' && "Start Live Translation"}
             {status === 'connecting' && "Connecting..."}
             {status === 'connected' && "Listening..."}
             {status === 'error' && "Connection Failed"}
           </h2>
           <p className="text-slate-400 max-w-xs mx-auto">
             {status === 'idle' && "Speak Japanese naturally. I will translate to Burmese in real-time."}
             {status === 'connected' && "I am translating your speech to Spoken Burmese."}
             {status === 'error' && errorMessage}
           </p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 z-20 flex items-center gap-6">
         {status === 'connected' && (
           <button 
             onClick={toggleMute}
             className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
           >
             {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
           </button>
         )}

         {status === 'idle' || status === 'error' ? (
           <button 
             onClick={startSession}
             className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all transform hover:scale-105"
           >
             <Mic className="w-5 h-5" />
             Start Call
           </button>
         ) : (
           <button 
             onClick={cleanup}
             className="p-4 bg-red-500/80 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:scale-105"
           >
             <PhoneOff className="w-8 h-8" />
           </button>
         )}
      </div>
    </div>
  );
};

export default LiveInterface;
