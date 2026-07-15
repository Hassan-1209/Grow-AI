import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Bot, User, HelpCircle, 
  Camera, Upload, Eye, RefreshCw, AlertCircle, 
  Activity, ShieldCheck, HeartPulse, Trash2, Sprout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface AdvisorViewProps {
  userProfile: UserProfile;
  onRefreshCredits: () => void;
  aiCredits: { remaining: number; total: number; used: number };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Sample mock plant health templates for instant multimodal testing
const SAMPLE_DISEASE_TEMPLATES = [
  {
    id: 'early-blight',
    name: 'Tomato Early Blight',
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=300',
    description: 'Black spot lesions with yellow halo ring outlines on bottom leaves.'
  },
  {
    id: 'mildew',
    name: 'Downy Mildew on Herbs',
    imageUrl: 'https://images.unsplash.com/photo-1628173141154-1ec098bb1fa4?auto=format&fit=crop&q=80&w=300',
    description: 'Fuzzy grey-purple spore spores under leaf surface.'
  },
  {
    id: 'healthy-kale',
    name: 'Healthy Organic Kale',
    imageUrl: 'https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?auto=format&fit=crop&q=80&w=300',
    description: 'Saturated green waxy texture leaf, crisp structural margins.'
  }
];

// Safe, lightweight, zero-dependency Markdown renderer for high-fidelity rendering of Gemini responses
function renderInlineFormatting(text: string) {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-emerald-950 font-sans">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded font-mono text-3xs font-semibold">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function parseMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        // Check for headings
        if (line.startsWith('### ')) {
          return <h4 key={idx} className="text-xs font-bold text-emerald-900 mt-3 mb-1 font-sans">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="text-sm font-bold text-emerald-900 mt-4 mb-1.5 font-sans">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={idx} className="text-base font-bold text-emerald-900 mt-4 mb-2 font-sans">{line.slice(2)}</h2>;
        }

        // Check for bullet lists
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const cleanText = line.trim().substring(2);
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-3">
              <span className="text-emerald-500 select-none mt-1 shrink-0">•</span>
              <span className="text-3xs text-gray-700 leading-relaxed font-sans">{renderInlineFormatting(cleanText)}</span>
            </div>
          );
        }

        // Numbered lists
        const numListMatch = line.trim().match(/^(\d+)\.\s(.*)/);
        if (numListMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-3">
              <span className="text-emerald-700 font-bold text-3xs select-none shrink-0">{numListMatch[1]}.</span>
              <span className="text-3xs text-gray-700 leading-relaxed font-sans">{renderInlineFormatting(numListMatch[2])}</span>
            </div>
          );
        }

        // Empty lines
        if (line.trim() === '') {
          return <div key={idx} className="h-1.5" />;
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-3xs text-gray-700 leading-relaxed font-sans">
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function AdvisorView({ 
  userProfile,
  onRefreshCredits,
  aiCredits
}: AdvisorViewProps) {
  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am **GrowLocal AI**, your expert agronomist and urban horticultural consultant. 

I am fully synchronized with your grower profile (managing a **${userProfile.gardenSize} sq ft** space, focusing on **${userProfile.primaryGoal}**). 

Ask me anything about companion configurations, non-toxic pest control, organic composting cycles, or winter soil preparation. You can also upload or click a plant leaf sample above to run a multi-modal health scan!`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Vision states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<string | null>(null);
  const [targetCropName, setTargetCropName] = useState('Tomato');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || sendingChat) return;

    const newMsgs = [...messages, { role: 'user', content: textToSend } as Message];
    setMessages(newMsgs);
    setInputText('');
    setSendingChat(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          userProfile
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.text || '';
        
        // Dynamic simulated streaming word-by-word
        const words = text.split(' ');
        let currentText = '';
        let wordIndex = 0;
        
        // Append an empty assistant response first
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        
        const streamInterval = setInterval(() => {
          if (wordIndex < words.length) {
            currentText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
            setMessages(prev => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = { 
                  role: 'assistant', 
                  content: currentText 
                };
              }
              return updated;
            });
            wordIndex++;
          } else {
            clearInterval(streamInterval);
            setSendingChat(false);
            onRefreshCredits(); // Update user credits immediately
          }
        }, 22); // 22ms per word is incredibly smooth, responsive, and satisfying
        
      } else {
        let errorMsg = 'Apologies, my server connection timed out. Please verify your GEMINI_API_KEY settings.';
        try {
          const errData = await res.json();
          if (errData.message) {
            errorMsg = `### ⚠️ Gemini API Configuration Error\n\n**Details:** ${errData.message}\n\n*Please open the Settings > Secrets menu and configure a valid GEMINI_API_KEY.*`;
          } else if (errData.error) {
            errorMsg = `### ⚠️ Server Error\n\n**Details:** ${errData.error}`;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        setSendingChat(false);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '### ❌ Connection Failure\nUnable to establish contact with the GrowLocal horticultural server. Please check your network or try restarting the development server.' }]);
      setSendingChat(false);
    }
  };

  const handleSelectTemplateImage = async (templateUrl: string, name: string) => {
    setSelectedImage(templateUrl);
    setTargetCropName(name);
    setDiagnosisResult(null);
  };

  // Convert uploaded image file to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setDiagnosisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunDiagnosis = async () => {
    if (!selectedImage || diagnosing) return;

    setDiagnosing(true);
    setDiagnosisResult(null);

    try {
      // Create Base64 payload
      const base64Data = selectedImage.split(',')[1] || selectedImage;
      const mimeType = selectedImage.startsWith('data:') 
        ? selectedImage.split(';')[0].split(':')[1] 
        : 'image/jpeg';

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: base64Data,
          mimeType,
          cropName: targetCropName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDiagnosisResult(data.text);
        onRefreshCredits();
      } else {
        setDiagnosisResult('#### ⚠️ Diagnostic Engine Failed\nCould not secure AI vision report. Please verify your Gemini API key activation.');
      }
    } catch (err) {
      setDiagnosisResult('#### ❌ Communication Failure\nUnable to connect to multi-modal vision service.');
    } finally {
      setDiagnosing(false);
    }
  };

  // Pre-loaded agronomy questions
  const SUGGESTED_PROMPTS = [
    'What are the best companions for tomatoes?',
    'How do I naturally repel spider mites?',
    'Explain the benefits of high-silica nettle spray.',
    'Best winter cover crops for organic soil.'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-700">
          <Bot className="w-5 h-5 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Agronomist Co-Pilot</span>
        </div>
        <h2 id="advisor-header" className="text-2xl font-sans font-bold text-gray-900 mt-1">GrowLocal AI Crop Advisor & Vision Diagnostic</h2>
        <p className="text-xs text-gray-500 mt-0.5">Diagnose crop diseases instantly with advanced computer vision or query organic growing techniques.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Leaf Health Multimodal Diagnostic (Lg: 5) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-50 flex items-center justify-between">
              <span>Leaf Diagnostic Scanner</span>
              <span className="text-3xs text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md font-semibold">Gemini Vision</span>
            </h3>

            {/* Selector templates */}
            <div>
              <span className="block text-3xs font-medium text-gray-400 mb-2">Tap diagnostic sample template to test or upload:</span>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_DISEASE_TEMPLATES.map(tmp => (
                  <button
                    key={tmp.id}
                    onClick={() => handleSelectTemplateImage(tmp.imageUrl, tmp.name)}
                    className={`p-1 border rounded-lg overflow-hidden text-left transition group relative cursor-pointer ${
                      selectedImage === tmp.imageUrl 
                        ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-500' 
                        : 'border-gray-100 bg-white hover:border-gray-300'
                    }`}
                  >
                    <img 
                      src={tmp.imageUrl} 
                      alt={tmp.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-12 object-cover rounded-md group-hover:scale-105 transition"
                    />
                    <span className="block text-4xs font-bold text-gray-700 truncate mt-1 text-center">{tmp.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Image Upload */}
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1">
                <Upload className="w-5 h-5 text-gray-400 mx-auto" />
                <span className="block text-3xs font-semibold text-gray-700">Drag/Drop or Upload Custom Leaf Photo</span>
                <span className="block text-4xs text-gray-400">Supports PNG, JPG, WEBP up to 5MB</span>
              </div>
            </div>

            {/* Preview image */}
            {selectedImage && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 text-xs">📷 Selected Target:</span>
                    <input
                      type="text"
                      className="text-xs font-bold bg-white border border-gray-200 rounded-md px-2 py-0.5 focus:outline-hidden text-gray-800"
                      value={targetCropName}
                      onChange={e => setTargetCropName(e.target.value)}
                      placeholder="e.g., Tomato"
                    />
                  </div>
                  <button 
                    onClick={() => { setSelectedImage(null); setDiagnosisResult(null); }}
                    className="text-3xs text-gray-400 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <img 
                  src={selectedImage} 
                  alt="Selected Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full max-h-40 object-cover rounded-lg border border-gray-200 shadow-3xs"
                />
                
                <button
                  id="btn-run-diagnosis"
                  onClick={handleRunDiagnosis}
                  disabled={diagnosing}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {diagnosing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Diagnosing Disease Vectors...
                    </>
                  ) : (
                    <>
                      <HeartPulse className="w-4 h-4 animate-pulse" /> Run AI Health Scan
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Diagnosis result */}
          {diagnosisResult && (
            <div className="mt-4 p-4 bg-teal-50/50 border border-teal-100 rounded-xl space-y-2 max-h-[300px] overflow-y-auto">
              <div className="flex items-center gap-1.5 text-teal-800 border-b border-teal-100/50 pb-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold">Agronomist Health Report:</span>
              </div>
              <div className="text-3xs text-teal-950 leading-relaxed space-y-1.5 whitespace-pre-wrap font-sans">
                {diagnosisResult}
              </div>
            </div>
          )}
        </div>

        {/* AI Agronomist Chat Console (Lg: 7) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col h-[520px] justify-between">
          
          <div className="flex items-center justify-between pb-3 border-b border-gray-50 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-gray-900 block">AI Agronomic Consultant</span>
                <span className="text-4xs text-emerald-600 flex items-center gap-1 font-semibold">
                  <Activity className="w-2.5 h-2.5 animate-pulse text-emerald-500" /> Secure Server Active
                </span>
              </div>
            </div>
            <button
              id="btn-clear-chat"
              onClick={() => setMessages([{
                role: 'assistant',
                content: `Cleared chat history. Ask me anything new about your garden, ${userProfile.name}!`
              }])}
              className="p-1 text-gray-400 hover:text-red-700 rounded-lg hover:bg-gray-50 transition"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick suggestions panel */}
          {messages.length <= 1 && (
            <div className="mb-3">
              <span className="block text-4xs font-bold text-gray-400 uppercase tracking-wider mb-2">Grower FAQ Shortcuts:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-3 py-1.5 text-3xs border border-gray-200 bg-gray-50/50 hover:bg-emerald-50 hover:border-emerald-200 text-gray-600 hover:text-emerald-950 rounded-full transition-colors cursor-pointer"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Message Log */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 mb-3 text-xs scrollbar-thin">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  key={i} 
                  className={`flex gap-3 max-w-[90%] md:max-w-[85%] ${
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs shadow-xs ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-500/20' 
                      : 'bg-white text-emerald-800 border border-gray-100 shadow-3xs'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  
                  <div className={`p-3.5 rounded-2xl shadow-3xs leading-relaxed text-xs transition-all ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none font-sans whitespace-pre-line shadow-md shadow-emerald-700/5'
                      : 'bg-slate-50/85 hover:bg-slate-50 border border-slate-100/80 text-gray-800 rounded-tl-none font-sans'
                  }`}>
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div className="markdown-body">
                        {parseMarkdown(msg.content)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sendingChat && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[85%]"
              >
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-white text-emerald-800 border border-gray-100 shadow-3xs">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="bg-slate-50 border border-slate-100/80 p-3.5 rounded-2xl rounded-tl-none text-xs text-gray-500 flex items-center gap-2.5 shadow-xs">
                  <span className="text-emerald-700 font-bold text-3xs uppercase tracking-wider animate-pulse">Consulting Co-Pilot</span>
                  <div className="flex gap-1 items-center py-1">
                    <motion.span 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-1.5 h-1.5 bg-emerald-500 rounded-full" 
                    />
                    <motion.span 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                      className="w-1.5 h-1.5 bg-emerald-600 rounded-full" 
                    />
                    <motion.span 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                      className="w-1.5 h-1.5 bg-emerald-700 rounded-full" 
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex gap-2 shrink-0 border-t border-gray-50 pt-3 md:pt-4"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask about companion planting, pest control, metrics..."
              className="flex-1 text-xs px-4 py-3 border border-gray-200/80 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 bg-gray-50/30 transition-all placeholder-gray-400"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!inputText.trim() || sendingChat}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-emerald-700/10 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </form>

        </div>

      </div>
    </div>
  );
}
