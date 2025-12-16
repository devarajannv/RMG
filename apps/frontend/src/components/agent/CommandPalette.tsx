import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AgentResponse {
  content: string;
  responseType: string;
  responseData?: any;
  model: string;
  tier: string;
  confidence: number;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const res = await api.get<{ suggestions: string[] }>('/agent/suggestions');
        setSuggestions((res as { suggestions: string[] }).suggestions || []);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      }
    };
    if (isOpen) loadSuggestions();
  }, [isOpen]);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setResult(null);
        setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setResult(null);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (text?: string) => {
    const queryText = text || query;
    if (!queryText.trim() || isLoading) return;

    setQuery(queryText);
    setIsLoading(true);
    setResult(null);

    try {
      const res = await api.get<AgentResponse>(`/agent/quick?q=${encodeURIComponent(queryText)}`);
      setResult(res as unknown as AgentResponse);
    } catch (error) {
      setResult({
        content: 'Sorry, I encountered an error. Please try again.',
        responseType: 'text',
        model: 'error',
        tier: 'error',
        confidence: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.responseData) {
      switch (result.responseType) {
        case 'cards':
          return (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {result.responseData.slice(0, 6).map((item: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm">{item.name}</div>
                  {item.designation && <div className="text-xs text-gray-500">{item.designation}</div>}
                  {item.skills && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.skills.slice(0, 2).map((s: string, j: number) => (
                        <span key={j} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );

        case 'gauge':
          const value = result.responseData.utilization || 0;
          return (
            <div className="flex items-center gap-4 mt-3 p-4 bg-gray-50 rounded-lg">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke={value >= 80 ? '#22c55e' : value >= 60 ? '#eab308' : '#ef4444'}
                    strokeWidth="6"
                    strokeDasharray={`${(value / 100) * 226} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                  {value}%
                </div>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Total Resources:</span>
                  <span className="font-medium">{result.responseData.total}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Allocated:</span>
                  <span className="font-medium text-green-600">{result.responseData.allocated}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">On Bench:</span>
                  <span className="font-medium text-orange-600">{result.responseData.bench}</span>
                </div>
              </div>
            </div>
          );

        default:
          return null;
      }
    }

    return <p className="text-gray-600 mt-3">{result.content}</p>;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
              setIsOpen(false);
              setResult(null);
              setQuery('');
            }}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl"
          >
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Ask anything about your resources, projects, or analytics..."
                  className="flex-1 text-lg outline-none"
                  disabled={isLoading}
                />
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
              </div>

              {/* Content */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                {result ? (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {result.tier}
                      </span>
                      <span>{result.model}</span>
                    </div>
                    <p className="font-medium mt-2">{result.content}</p>
                    {renderResult()}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 font-medium">Suggestions</p>
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSubmit(suggestion)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg',
                          'bg-gray-50 hover:bg-blue-50 text-left transition-colors'
                        )}
                      >
                        <span>{suggestion}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span>
                    <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-sm">Enter</kbd> to search
                  </span>
                  <span>
                    <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-sm">Esc</kbd> to close
                  </span>
                </div>
                <span className="text-blue-500">Powered by AI</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;

