import React from 'react';
import { Search, Database, Trash2 } from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenBackupRestore: () => void;
  onClearAllData: () => Promise<void>;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenBackupRestore,
  onClearAllData,
  isOnline,
}) => {
  const handleClearAll = async () => {
    if (
      window.confirm(
        'Are you sure you want to PERMANENTLY delete ALL database records (categories, classes, students, rooms, sessions, seating plans)? This action cannot be undone!'
      )
    ) {
      await onClearAllData();
      alert('All data has been permanently cleared.');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
      {/* Left Breadcrumb & Portal Title */}
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className="text-slate-400 font-semibold">Home</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-bold">Noorul Huda Examination Portal</span>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex flex-1 max-w-sm mx-8">
        <button
          onClick={onOpenSearch}
          className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded px-3 py-1.5 flex items-center text-xs transition"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <span className="truncate">Search Students, Rooms, Seat IDs...</span>
          <span className="ml-auto bg-slate-200/80 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono">
            Ctrl+K
          </span>
        </button>
      </div>

      {/* Right Controls & Status */}
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded text-[11px] font-semibold text-slate-600 border border-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isOnline ? 'Firebase Connected' : 'Offline Mode'}
          </span>
        </div>

        <button
          onClick={handleClearAll}
          title="Permanently Delete All Data"
          className="px-3 py-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 bg-rose-50/50 rounded text-xs font-semibold flex items-center transition"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
          <span className="hidden lg:inline">Clear All Data</span>
        </button>

        <button
          onClick={onOpenBackupRestore}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition"
        >
          <Database className="w-3.5 h-3.5 text-blue-100" />
          <span>Backup/Restore</span>
        </button>
      </div>
    </header>
  );
};

