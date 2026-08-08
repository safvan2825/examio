import React from 'react';
import {
  FolderTree,
  GraduationCap,
  Users,
  Grid,
  Calendar,
  Layers,
  Monitor,
  Armchair,
  ArrowRight,
  Play,
} from 'lucide-react';
import { Category, ClassItem, Student, Room, ExamSession } from '../types';

interface DashboardViewProps {
  categories: Category[];
  classes: ClassItem[];
  students: Student[];
  rooms: Room[];
  sessions: ExamSession[];
  onNavigate: (tab: any) => void;
  onSelectSessionForGenerator: (sessionId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  categories,
  classes,
  students,
  rooms,
  sessions,
  onNavigate,
  onSelectSessionForGenerator,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSessions = sessions.filter((s) => s.date === todayStr);

  // Capacities
  let manualCapacity = 0;
  let onlineCapacity = 0;

  rooms.forEach((r) => {
    if (r.examMode === 'Manual') {
      r.sides?.forEach((side) => {
        manualCapacity += side.cols * side.rows;
      });
    } else if (r.examMode === 'Online') {
      const slots = r.onlineSlots?.length || 1;
      onlineCapacity += (r.onlineCapacity || 0) * slots;
    }
  });

  const cards = [
    {
      label: 'Total Categories',
      value: categories.length,
      icon: FolderTree,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      tab: 'categories',
    },
    {
      label: 'Total Classes',
      value: classes.length,
      icon: GraduationCap,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
      tab: 'classes',
    },
    {
      label: 'Total Students',
      value: students.length,
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      tab: 'students',
    },
    {
      label: 'Total Rooms',
      value: rooms.length,
      icon: Grid,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200',
      tab: 'rooms',
    },
    {
      label: 'Total Sessions',
      value: sessions.length,
      icon: Calendar,
      color: 'bg-amber-500/10 text-amber-600 border-amber-200',
      tab: 'timetable',
    },
    {
      label: "Today's Sessions",
      value: todaysSessions.length,
      icon: Layers,
      color: 'bg-rose-500/10 text-rose-600 border-rose-200',
      tab: 'timetable',
    },
    {
      label: 'Manual Room Capacity',
      value: manualCapacity,
      icon: Armchair,
      color: 'bg-teal-500/10 text-teal-600 border-teal-200',
      tab: 'rooms',
    },
    {
      label: 'Online Room Capacity',
      value: onlineCapacity,
      icon: Monitor,
      color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
      tab: 'rooms',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 rounded-lg p-5 text-white shadow-xs border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white mb-2">
            Noorul Huda Board
          </span>
          <h2 className="text-lg font-bold tracking-tight">Exam Seating & Operational Dashboard</h2>
          <p className="text-slate-400 text-xs mt-1">
            Manage categories, classes, student registers, room infrastructure, and auto-allocate seats.
          </p>
        </div>
        <button
          onClick={() => onNavigate('generator')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded shadow-xs flex items-center transition shrink-0"
        >
          <Play className="w-3.5 h-3.5 mr-2 fill-current" />
          Run Allocation Engine
        </button>
      </div>

      {/* High Density Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.tab)}
              className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs hover:shadow-xs transition cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {card.label}
                </span>
                <div className={`p-1.5 rounded border ${card.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">
                  {card.value.toLocaleString()}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Sessions & Quick Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Sessions */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Today's Exam Sessions</h3>
              <p className="text-xs text-slate-500">Scheduled for {todayStr}</p>
            </div>
            <button
              onClick={() => onNavigate('timetable')}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              View All Sessions →
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {todaysSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded border border-dashed border-slate-200">
                No exam sessions scheduled for today.
              </div>
            ) : (
              todaysSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/60 flex items-center justify-between transition"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{sess.date} ({sess.time})</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span className="text-blue-700 font-medium">{sess.classConfigs.length} Classes Involved</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectSessionForGenerator(sess.id)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-xs flex items-center transition"
                  >
                    <span>Allocate Seats</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Quick Overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">
              Examination Workflow
            </h3>

            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Configure categories, classes, and import student database.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Setup door and window side matrices for room infrastructure.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Schedule exam timetable sessions and select participating classes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>Run automated generator to build conflict-free seating layouts.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('students')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded text-center transition"
            >
              Manage Student Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
