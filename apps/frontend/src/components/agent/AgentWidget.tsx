import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  responseType?: string;
  responseData?: any;
  timestamp: Date;
}

interface AgentResponse {
  content: string;
  responseType: string;
  responseData?: any;
  model: string;
  tier: string;
  confidence: number;
}

export function AgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load suggestions on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadSuggestions = async () => {
      try {
        const res = await api.get<{ suggestions: string[] }>('/agent/suggestions');
        setSuggestions((res as { suggestions: string[] }).suggestions || []);
      } catch (error) {
        // Silently fail - suggestions are not critical
        console.debug('Failed to load suggestions:', error);
      }
    };
    loadSuggestions();
  }, [isAuthenticated]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (text?: string) => {
    const queryText = text || query;
    if (!queryText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await api.post<AgentResponse>('/agent/query', { query: queryText });
      const data = res as unknown as AgentResponse;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        responseType: data.responseType,
        responseData: data.responseData,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResponseData = (message: Message) => {
    if (!message.responseData) return null;

    switch (message.responseType) {
      case 'cards':
        return (
          <div className="grid grid-cols-1 gap-2 mt-2">
            {message.responseData.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="bg-white/50 rounded-lg p-2 text-xs">
                <div className="font-medium">{item.name}</div>
                {item.designation && <div className="text-gray-500">{item.designation}</div>}
                {item.skills && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.skills.slice(0, 3).map((s: string, j: number) => (
                      <span key={j} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {message.responseData.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                +{message.responseData.length - 5} more
              </div>
            )}
          </div>
        );

      case 'gauge':
        const value = message.responseData.utilization || 0;
        return (
          <div className="flex items-center gap-3 mt-2 bg-white/50 rounded-lg p-3">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={value >= 80 ? '#22c55e' : value >= 60 ? '#eab308' : '#ef4444'}
                  strokeWidth="6"
                  strokeDasharray={`${(value / 100) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                {value}%
              </div>
            </div>
            <div className="text-xs">
              <div>Total: {message.responseData.total}</div>
              <div>Allocated: {message.responseData.allocated}</div>
              <div>Bench: {message.responseData.bench}</div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {message.responseData.slice(0, 5).map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 font-medium">{item.name}</td>
                    <td className="py-1 text-gray-500">{item.designation || item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg',
          'bg-gradient-to-br from-blue-600 to-indigo-600 text-white',
          'flex items-center justify-center hover:scale-105 transition-transform',
          isOpen && 'hidden'
        )}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-h-[600px] flex flex-col"
          >
            <Card className="shadow-2xl border-0 overflow-hidden flex flex-col h-full">
              {/* Header */}
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">RMG Assistant</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Beta</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] bg-gray-50">
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center text-gray-500 text-sm">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <p className="font-medium">How can I help you today?</p>
                      <p className="text-xs mt-1">Ask me anything about resources, projects, or analytics.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Try asking:</p>
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSubmit(suggestion)}
                          className="w-full text-left text-sm bg-white hover:bg-blue-50 p-2 rounded-lg border border-gray-100 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg p-3 text-sm',
                          message.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-100 rounded-bl-none shadow-sm'
                        )}
                      >
                        <p>{message.content}</p>
                        {message.role === 'assistant' && renderResponseData(message)}
                        {message.role === 'assistant' && (
                          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                            <button className="text-gray-400 hover:text-green-500 transition-colors">
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button className="text-gray-400 hover:text-red-500 transition-colors">
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-lg p-3 rounded-bl-none shadow-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input */}
              <div className="p-3 border-t bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!query.trim() || isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <div className="text-[10px] text-gray-400 text-center mt-2">
                  Press <kbd className="bg-gray-100 px-1 py-0.5 rounded">⌘K</kbd> to toggle
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AgentWidget;

