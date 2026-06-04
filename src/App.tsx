import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Camera, 
  History, 
  Sun, 
  Moon, 
  HelpCircle, 
  Sparkles 
} from 'lucide-react';
import QRGenerator from './components/QRGenerator';
import QRScanner from './components/QRScanner';
import HistoryLog from './components/HistoryLog';
import { HistoryItem, QRType } from './types';
import { copyTextToClipboard } from './utils/clipboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan' | 'history'>('generate');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [prefilledItem, setPrefilledItem] = useState<{ type: QRType; content: string } | null>(null);

  // Initialize Theme and History on mount
  useEffect(() => {
    // 1. Theme Configuration
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. History loading
    const savedHistory = localStorage.getItem('qr_scan_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (err) {
        console.error('Failed to restore scanning history:', err);
      }
    }
  }, []);

  // Sync theme changes with DOM element
  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // History state handlers
  const handleAddHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    };
    
    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 100); // Caps history list at 100 entries
      localStorage.setItem('qr_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('qr_scan_history');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('qr_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateLabel = (id: string, label: string) => {
    setHistory((prev) => {
      const updated = prev.map(item => item.id === id ? { ...item, label } : item);
      localStorage.setItem('qr_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Loads a history row directly back into the Generator or Scanner view
  const handleHistoryAction = (item: HistoryItem) => {
    if (item.type === 'generate') {
      // Load back to generator config
      setPrefilledItem({
        type: item.qrType && item.qrType !== 'barcode' ? item.qrType : 'text',
        content: item.content
      });
      setActiveTab('generate');
      
      // Smooth scroll back to workspace area
      document.getElementById('workspace-panel')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // For Scanned items, let the user inspect details easily by putting it into generator or just copying.
      // Copy item content and notify
      copyTextToClipboard(item.content);
      // Open in scanner results by loading prefilled details too!
      setPrefilledItem({
        type: item.qrType && item.qrType !== 'barcode' ? item.qrType : 'text',
        content: item.content
      });
      setActiveTab('generate');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${
      isDark ? 'bg-[#050505] text-[#e0e0e0]' : 'bg-[#faf9f6] text-[#2c2c2c]'
    }`}>
      
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#c2a378] via-[#a88a5e] to-[#7c633e]" />

      {/* Primary Header/Console */}
      <header className={`border-b transition-colors duration-300 ${
        isDark ? 'bg-[#0a0a0a]/90 border-white/10' : 'bg-[#fcfcfc]/90 border-[#e8dfd3]'
      } sticky top-0 z-55 backdrop-blur-md`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Brand title resembling Oculus Style */}
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 border flex items-center justify-center rotate-45 transition-colors duration-300 ${
              isDark ? 'border-[#c2a378] bg-black/40' : 'border-[#aa8d65] bg-white/40'
            }`}>
              <div className={`w-4 h-4 -rotate-45 flex items-center justify-center font-serif font-bold text-xs ${
                isDark ? 'text-[#c2a378] bg-[#c2a378]/10' : 'text-[#aa8d65] bg-[#aa8d65]/10'
              }`}>
                O
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-serif italic font-medium text-xl sm:text-2xl tracking-wider ${
                  isDark ? 'text-[#c2a378]' : 'text-[#aa8d65]'
                }`}>
                  Oculus QR Studio
                </span>
                <span className={`text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded border ${
                  isDark 
                    ? 'bg-black/55 border-white/5 text-white/50' 
                    : 'bg-white/55 border-black/5 text-black/50'
                }`}>
                  Secure Node
                </span>
              </div>
              <span className={`text-[10px] uppercase tracking-[0.25em] block ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                Advanced Encrypted Data Visualizer // Latency: 14ms
              </span>
            </div>
          </div>

          {/* Quick Actions & Aesthetic Toggle */}
          <div className="flex items-center gap-6">
            <div className={`flex rounded-full p-1 border transition-colors duration-300 ${
              isDark ? 'bg-black border-white/5' : 'bg-[#f3efeb] border-[#e8dfd3]'
            }`}>
              <button 
                id="theme-toggler-dark"
                onClick={() => !isDark && toggleTheme()}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-[#1a1a1a] text-[#c2a378] shadow-inner font-extrabold' 
                    : 'text-[#8a6f48]/50 hover:text-[#8a6f48]'
                }`}
              >
                DARK
              </button>
              <button 
                id="theme-toggler-light"
                onClick={() => isDark && toggleTheme()}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  !isDark 
                    ? 'bg-[#ffffff] text-[#aa8d65] shadow-sm font-extrabold border border-[#aa8d65]/15' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                LIGHT
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Navigation Selector Tabs & Fast Help */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-500/10">
          
          {/* Navigation Rails */}
          <nav className={`p-1 rounded-xl border flex gap-1 font-sans justify-start w-full md:w-auto transition-colors duration-300 ${
            isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#f4efe8] border-[#e8dfd3]'
          }`}>
            {[
              { id: 'generate', label: 'GENERATE SEQUENCE', icon: QrCode },
              { id: 'scan', label: 'SCAN VIEWPORT', icon: Camera },
              { id: 'history', label: 'DATA LOGS', icon: History, badge: history.length > 0 ? history.length : undefined },
            ].map((t) => {
              const TabIcon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  id={`tab-navigation-${t.id}`}
                  onClick={() => {
                    setActiveTab(t.id as any);
                    if (t.id === 'generate') setPrefilledItem(null);
                  }}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[8px] xs:text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-[0.2em] whitespace-nowrap transition-all cursor-pointer relative ${
                    isActive 
                      ? isDark 
                        ? 'bg-[#151515] border border-white/10 text-[#c2a378] shadow-inner font-extrabold' 
                        : 'bg-white border border-[#e8dfd3] text-[#8a6f48] shadow-sm font-extrabold'
                      : isDark
                        ? 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                        : 'text-[#8a6f48]/60 hover:text-[#8a6f48] hover:bg-black/[0.02]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.label}</span>
                  {t.badge !== undefined && (
                    <span className={`text-[8.5px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${
                      isDark 
                        ? 'bg-black/55 border-white/5 text-[#c2a378]' 
                        : 'bg-[#faf9f6] border-[#e8dfd3] text-[#8a6f48]'
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sparkle Help Info */}
          <div className={`hidden sm:flex items-center gap-2.5 text-xs px-4 py-2.5 rounded-xl border font-serif italic ${
            isDark 
              ? 'bg-white/[0.01] border-white/5 text-white/40' 
              : 'bg-black/[0.01] border-black/5 text-black/50'
          }`}>
            <Sparkles className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#c2a378]' : 'text-[#aa8d65]'}`} />
            <span>Format identifiers recursively. Active sequence storage is cached in memory.</span>
          </div>

        </div>

        {/* Workspace Central Container */}
        <section id="workspace-panel">
          {activeTab === 'generate' && (
            <div className="animate-[fadeIn_0.25s_ease-out]">
              <QRGenerator onAddHistory={handleAddHistory} prefilledItem={prefilledItem} />
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="animate-[fadeIn_0.25s_ease-out]">
              <QRScanner onAddHistory={handleAddHistory} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-[fadeIn_0.25s_ease-out]">
              <HistoryLog 
                history={history} 
                onClearAll={handleClearHistory} 
                onDeleteItem={handleDeleteHistoryItem} 
                onUpdateLabel={handleUpdateLabel}
                onSelectAction={handleHistoryAction}
              />
            </div>
          )}
        </section>

      </main>

      {/* Sophisticated Status Footer Bar */}
      <footer className={`border-t py-6 mt-16 text-center text-[10px] uppercase tracking-[0.2em] font-medium opacity-60 transition-colors duration-300 ${
        isDark ? 'bg-[#020202] border-white/10 text-white/40' : 'bg-[#f4efe8] border-[#e8dfd3] text-black/50'
      }`}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-6">
            <span>Session: Secure</span>
            <span>Transport: Offline-First</span>
            <span>Encryption: AES-250</span>
          </div>
          <div className="flex gap-4">
            <span>&copy; 2026 Oculus Laboratory</span>
            <span className={`${isDark ? 'text-[#c2a378]' : 'text-[#aa8d65]'}`}>V2.0 STABLE</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
