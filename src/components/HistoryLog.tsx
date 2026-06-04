import React, { useState } from 'react';
import { 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  ExternalLink, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar,
  Tag,
  Eye,
  Filter
} from 'lucide-react';
import { HistoryItem, QRType } from '../types';
import { copyTextToClipboard } from '../utils/clipboard';

interface HistoryLogProps {
  history: HistoryItem[];
  onClearAll: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onSelectAction: (item: HistoryItem) => void; // Trigger callback loads item back into gen or viewer
}

export default function HistoryLog({ 
  history, 
  onClearAll, 
  onDeleteItem, 
  onUpdateLabel, 
  onSelectAction 
}: HistoryLogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'scan' | 'generate'>('all');
  const [copiedId, setCopiedId] = useState<string>('');
  const [editingId, setEditingId] = useState<string>('');
  const [tempLabel, setTempLabel] = useState<string>('');

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleCopy = (id: string, text: string) => {
    copyTextToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const startEditing = (item: HistoryItem) => {
    setEditingId(item.id);
    setTempLabel(item.label || '');
  };

  const saveLabel = (id: string) => {
    onUpdateLabel(id, tempLabel.trim());
    setEditingId('');
  };

  // Filter logic
  const filteredHistory = history.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.label && item.label.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div id="history-panel-root" className="bg-white dark:bg-[#0a0a0a] border border-[#e8dfd3]/80 dark:border-white/10 shadow-sm rounded-xl p-6 space-y-6 transition-colors duration-300">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e8dfd3]/50 dark:border-white/5">
        <div>
          <h3 className="font-serif italic text-lg text-[#8a6f48] dark:text-[#c2a378]">
            Scan and Generation Registry
          </h3>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30 block mt-1">
            Persistent hardware log • Total entries: {history.length} units
          </span>
        </div>

        {history.length > 0 && (
          <button
            id="clear-all-history-btn"
            onClick={onClearAll}
            className="self-start md:self-auto text-[10px] font-mono tracking-widest uppercase font-extrabold text-rose-600 hover:text-rose-700 dark:hover:text-rose-450 flex items-center gap-1 bg-rose-50 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log
          </button>
        )}
      </div>

      {/* Filter and Search rail */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 font-mono text-xs">
        
        {/* Search */}
        <div className="md:col-span-7 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search records by parsed contents or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs border border-[#e8dfd3] dark:border-white/10 bg-white dark:bg-[#121212] text-[#2c2c2c] dark:text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-[#aa8d65] dark:focus:ring-[#c2a378] focus:border-[#aa8d65] dark:focus:border-[#c2a378] font-sans transition-all shadow-inner"
          />
        </div>

        {/* Filter Selection */}
        <div className="md:col-span-5 flex rounded-lg border border-[#e8dfd3] dark:border-white/10 bg-slate-50 dark:bg-[#070707] p-1 font-mono shadow-inner">
          {[
            { id: 'all', label: 'All items' },
            { id: 'scan', label: 'Scans' },
            { id: 'generate', label: 'Generated' },
          ].map((type) => (
            <button
              key={type.id}
              id={`history-filter-${type.id}`}
              onClick={() => setTypeFilter(type.id as any)}
              className={`flex-1 text-center py-1 rounded text-[10px] uppercase font-extrabold tracking-wider transition-all cursor-pointer ${
                typeFilter === type.id 
                  ? 'bg-white dark:bg-[#151515] text-[#8a6f48] dark:text-[#c2a378] shadow-sm border border-[#e8dfd3]/60 dark:border-white/5' 
                  : 'text-slate-500 dark:text-white/30 hover:text-[#aa8d65] dark:hover:text-[#c2a378]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

      </div>

      {/* History Feed List */}
      {filteredHistory.length > 0 ? (
        <div className="divide-y divide-[#e8dfd3]/40 dark:divide-white/5 max-h-[480px] overflow-y-auto pr-1">
          {filteredHistory.map((item) => {
            const isScan = item.type === 'scan';
            return (
              <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                
                {/* Visual Label Column */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <span className={`p-2.5 rounded-lg shrink-0 mt-0.5 border ${
                    isScan 
                      ? 'bg-[#f4efe8]/60 border-[#e8dfd3] dark:bg-[#111] dark:border-white/5 text-[#aa8d65] dark:text-[#c2a378]' 
                      : 'bg-zinc-50 dark:bg-zinc-900 border-[#e8dfd3]/60 dark:border-white/5 text-[#8a6f48]'
                  }`}>
                    {isScan ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </span>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Label or Editable Input */}
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1.5 max-w-[240px]">
                          <input
                            id={`edit-label-input-${item.id}`}
                            type="text"
                            value={tempLabel}
                            onChange={(e) => setTempLabel(e.target.value)}
                            placeholder="Add descriptive label..."
                            className="px-2 py-0.5 text-xs font-mono rounded border border-[#e8dfd3] dark:border-white/10 bg-[#faf9f6] dark:bg-black text-[#2c2c2c] dark:text-[#e0e0e0] outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && saveLabel(item.id)}
                            autoFocus
                          />
                          <button
                            id={`save-label-btn-${item.id}`}
                            onClick={() => saveLabel(item.id)}
                            className="p-1 rounded bg-[#f4efe8] text-[#aa8d65] hover:bg-[#ebd3b4]/30 dark:bg-[#151515] dark:text-[#c2a378] text-xs font-bold cursor-pointer"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-serif italic font-medium text-[#2c2c2c] dark:text-white/80 text-sm truncate max-w-[200px]">
                            {item.label || (isScan ? 'Scanned Record' : `Custom Matrix`)}
                          </span>
                          <button
                            id={`edit-label-trigger-${item.id}`}
                            onClick={() => startEditing(item)}
                            title="Add Custom Label"
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-[#aa8d65] dark:hover:text-[#c2a378] rounded transition-opacity cursor-pointer inline-flex"
                          >
                            <Tag className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Format tag */}
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider bg-[#faf9f6]/80 dark:bg-black px-2 py-0.5 rounded text-slate-500 dark:text-white/40 border border-[#e8dfd3]/30 dark:border-white/5">
                        {item.qrType === 'barcode' ? (item.barcodeFormat || 'barcode') : item.qrType}
                      </span>
                    </div>

                    {/* Scanned/Generated code string */}
                    <p className="text-xs text-slate-500 font-mono break-all line-clamp-2 max-w-xl">
                      {item.content}
                    </p>

                    {/* Meta layout */}
                    <div className="flex items-center gap-3 text-[9px] font-mono text-slate-400 pt-0.5 uppercase tracking-wider">
                      <span className="flex items-center gap-1 shrink-0 text-[#8a6f48] dark:text-white/30">
                        <Calendar className="w-3 h-3" />
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-1.5 shrink-0 ml-12 md:ml-0 font-mono">
                  {/* Load/Load Back into viewer */}
                  <button
                    id={`load-history-action-${item.id}`}
                    onClick={() => onSelectAction(item)}
                    title={isScan ? "Open Scanned Result details" : "Load back into Generator"}
                    className="p-1.5 rounded bg-white hover:bg-[#fcfcfc] dark:bg-[#0a0a0a]/50 dark:hover:bg-white/[0.02] text-[#8a6f48] hover:text-[#aa8d65] dark:text-white/60 dark:hover:text-[#c2a378] text-[9px] font-extrabold uppercase tracking-widest border border-[#e8dfd3] dark:border-white/10 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{isScan ? 'View' : 'Load'}</span>
                  </button>

                  {/* Copy content */}
                  <button
                    id={`copy-history-btn-${item.id}`}
                    onClick={() => handleCopy(item.id, item.content)}
                    title="Copy to Clipboard"
                    className="p-1.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 text-slate-500 hover:text-[#aa8d65] bg-white hover:bg-slate-50 dark:bg-[#0a0a0a]/50 dark:hover:bg-[#111] flex items-center justify-center cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Delete Item */}
                  <button
                    id={`delete-history-btn-${item.id}`}
                    onClick={() => onDeleteItem(item.id)}
                    title="Delete Entry"
                    className="p-1.5 rounded-lg border border-[#e8dfd3] dark:border-white/10 text-slate-400 hover:text-rose-500 hover:border-rose-100 bg-white hover:bg-rose-50 dark:bg-[#0a0a0a]/50 dark:hover:bg-rose-950/30 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 space-y-3 border border-dashed border-[#e8dfd3] dark:border-white/10 rounded-xl">
          <div className="text-slate-450 max-w-xs mx-auto">
            <Filter className="w-7 h-7 text-slate-350 dark:text-white/20 mx-auto mb-2" />
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#8a6f48] dark:text-white/40">Log File is Vacant</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wide leading-relaxed">
              {searchTerm || typeFilter !== 'all' 
                ? "Verify search variables or reset filter standard." 
                : "Decoded feeds and master codes will be logged here for diagnostic reference."}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
