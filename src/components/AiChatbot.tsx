/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Ticket, KBArticle } from '../types';
import { MessageSquare, X, Send, Sparkles, RefreshCw, Bot, Minimize2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AiChatbotProps {
  activeTicketContext: Ticket | null;
  kbArticles: KBArticle[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function AiChatbot({ activeTicketContext, kbArticles }: AiChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Halo! Saya **ITSM AI Co-pilot**. Anda dapat menanyakan panduan operasional TI, meminta draf tanggapan untuk tiket aktif, atau mencocokkan masalah dengan Basis Pengetahuan perusahaan kami. Ada yang bisa saya bantu hari ini?',
      createdAt: new Date().toISOString()
    }
  ]);
  
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Expose opening control globally
  useEffect(() => {
    (window as any).openAiChatbot = () => {
      setIsOpen(true);
    };
    return () => {
      try {
        delete (window as any).openAiChatbot;
      } catch (e) {}
    };
  }, []);

  // Auto scroll down chats
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userText = inputText;
    setInputText('');
    setErrorMessage(null);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsSending(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          selectedTicketContext: activeTicketContext,
          knowledgeArticles: kbArticles
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error occurred');
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('GEMINI_API_KEY_MISSING')) {
        setErrorMessage('Dukungan AI tidak aktif karena Gemini API Key belum diautentikasi di secrets panel.');
      } else {
        setErrorMessage(err.message || 'Sistem gagal menghubungi server Co-pilot.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans" id="floating-ai-chatbot-system">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-80 sm:w-96 h-[500px] flex flex-col justify-between overflow-hidden"
          >
            {/* Chat header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Sparkles size={16} className="text-white fill-indigo-200" />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-sans">ITSM AI Co-pilot</h3>
                  <p className="text-[10px] text-indigo-400 font-bold tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    Gemini 3.5 Assistant Active
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Minimize2 size={16} />
              </button>
            </div>

            {/* Context bar (visible when a ticket is being viewed) */}
            {activeTicketContext && (
              <div className="bg-indigo-50 border-b border-indigo-100 p-2 text-[10px] text-indigo-800 flex items-center justify-between">
                <span className="truncate pr-4">Konteks Aktif: <b>{activeTicketContext.id} - {activeTicketContext.title}</b></span>
                <span className="shrink-0 bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-extrabold font-mono">Linked</span>
              </div>
            )}

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((m) => {
                const isAi = m.role === 'assistant';
                return (
                  <div key={m.id} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                    <div className="flex gap-2 max-w-[85%] items-start">
                      {isAi && (
                        <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          <Bot size={12} className="text-white" />
                        </div>
                      )}
                      
                      <div className={`p-3 rounded-xl text-xs font-medium leading-relaxed shadow-xs ${
                        isAi 
                          ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-none' 
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}>
                        {/* Render simple simulation of markdown paragraphs */}
                        <p className="whitespace-pre-line">{m.content.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[85%] items-center text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-sans tracking-wide flex items-center gap-1 font-bold animate-pulse">
                      <RefreshCw size={12} className="animate-spin" />
                      Gemini berpikir...
                    </span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Sambungan Terputus</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
              <input
                type="text"
                placeholder="Ajukan masalah TI atau tanyakan manual..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
                className="flex-1 bg-slate-50 border-0 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-lg cursor-pointer transition shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.button
            id="ai-support-activator"
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full p-4 flex items-center justify-center shadow-xl border border-slate-850 cursor-pointer text-sm font-bold gap-2"
          >
            <Sparkles size={18} className="text-indigo-400 fill-indigo-400/40" />
            ITSM AI Co-pilot
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
