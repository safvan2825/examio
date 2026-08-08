import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  GraduationCap,
  Users,
  Grid,
  Calendar,
  Layers,
  Search,
  Settings,
  LogOut,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'categories'
  | 'classes'
  | 'students'
  | 'rooms'
  | 'timetable'
  | 'generator'
  | 'search'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onLogout }) => {
  const managementItems: { id: NavTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'students', label: 'Student Database', icon: Users },
    { id: 'rooms', label: 'Room Infrastructure', icon: Grid },
  ];

  const operationsItems: { id: NavTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'generator', label: 'Seating Generator', icon: Layers },
    { id: 'timetable', label: 'Exam Timetable', icon: Calendar },
    { id: 'search', label: 'Search Records', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 min-h-screen">
      <div className="p-5 border-b border-slate-800 text-white font-bold tracking-tight text-base">
        Noorul Huda
        <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
          Examination Board
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1.5">
            Management
          </div>
          <div className="space-y-1">
            {managementItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1.5">
            Operations
          </div>
          <div className="space-y-1">
            {operationsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isGenerator = item.id === 'generator';
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : isGenerator
                      ? 'text-orange-400 hover:bg-slate-800/60 hover:text-orange-300'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isGenerator ? 'text-orange-400' : isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            NH
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Admin Portal</p>
            <p className="text-[10px] text-slate-400 truncate">Firebase Connected</p>
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            title="Logout of Portal"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};

