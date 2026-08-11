import React from 'react';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock3, FolderTree, GraduationCap, MapPin, Users, AlertCircle } from 'lucide-react';
import { Category, ClassItem, Student, ExamSession, Subject, AbsenteeRecord } from '../types';
import { Campus, Examination } from '../types/tenant';

interface DashboardViewProps {
  campus: Campus;
  categories: Category[];
  classes: ClassItem[];
  students: Student[];
  sessions: ExamSession[];
  examinationCount: number;
  examinations: Examination[];
  subjects?: Subject[];
  absenteeRecords?: AbsenteeRecord[];
  onNavigate: (tab: any) => void;
  onSelectSessionForGenerator: (sessionId: string) => void;
  onOpenExamination: (exam: Examination) => void;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusMeta = (status: Examination['status']) => ({
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  active: { label: 'Ongoing', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', cls: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
}[status]);

export const DashboardView: React.FC<DashboardViewProps> = ({
  campus, categories, classes, students, sessions, examinationCount, examinations, subjects = [], absenteeRecords = [], onNavigate, onSelectSessionForGenerator, onOpenExamination
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysSessions = sessions.filter(s => s.date === todayStr);
  const todaysAbsentees = absenteeRecords.filter(r => r.date === todayStr);
  const currentExam = [...examinations].sort((a, b) => {
    const activeRank = (x: Examination) => x.status === 'active' ? 3 : x.status === 'scheduled' ? 2 : x.status === 'draft' ? 1 : 0;
    return activeRank(b) - activeRank(a) || String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
  })[0] || null;
  const recentExams = [...examinations].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))).slice(0, 5);
  const examStatus = currentExam ? statusMeta(currentExam.status) : null;
  const examDays = currentExam ? Math.max(1, Math.ceil((new Date(`${currentExam.endDate}T00:00:00`).getTime() - new Date(`${currentExam.startDate}T00:00:00`).getTime()) / 86400000) + 1) : 0;

  const stats = [
    { label: 'Classes participating', value: classes.length, icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', tab: 'classes' },
    { label: 'Students', value: students.length, icon: Users, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', tab: 'students' },
    { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'bg-violet-50 text-violet-600 border-violet-100', tab: 'subjects' },
    { label: 'Examination days', value: examDays || '—', icon: CalendarDays, color: 'bg-amber-50 text-amber-600 border-amber-100', tab: 'examinations' },
  ];

  return <div className="space-y-6">
    {/* Campus identity */}
    <section className="bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="text-[11px] font-black tracking-[0.16em] uppercase text-cyan-700">{campus.name}</div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-1">Examination Management System</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/>{[campus.place, campus.district, campus.state].filter(Boolean).join(' · ') || 'Campus workspace'}</p>
      </div>
      <button onClick={() => onNavigate('examinations')} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 transition">Open Examinations <ArrowRight className="w-4 h-4"/></button>
    </section>

    {/* Current examination */}
    {currentExam ? <section className="bg-white border border-cyan-100 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 md:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] font-black tracking-[0.16em] uppercase text-cyan-700">Current Examination</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${examStatus?.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${examStatus?.dot}`}/>{examStatus?.label}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 truncate">{currentExam.name}</h2>
          <p className="text-sm text-slate-500 mt-2">{formatDate(currentExam.startDate)} <span className="mx-1">→</span> {formatDate(currentExam.endDate)}{currentExam.academicYear ? <span className="ml-3">· {currentExam.academicYear}</span> : null}</p>
          {currentExam.description && <p className="text-sm text-slate-500 mt-3 max-w-2xl">{currentExam.description}</p>}
        </div>
        <button onClick={() => onOpenExamination(currentExam)} className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 transition shadow-sm">Open Examination <ArrowRight className="w-4 h-4"/></button>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 grid grid-cols-2 md:grid-cols-4">
        <div className="p-4 border-r border-slate-100"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Classes</span><div className="text-lg font-black text-slate-900 mt-1">{classes.length}</div></div>
        <div className="p-4 md:border-r border-slate-100"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Students</span><div className="text-lg font-black text-slate-900 mt-1">{students.length}</div></div>
        <div className="p-4 border-r border-slate-100"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Today's sessions</span><div className="text-lg font-black text-slate-900 mt-1">{todaysSessions.length}</div></div>
        <div className="p-4"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Today's absentees</span><div className="text-lg font-black text-slate-900 mt-1">{todaysAbsentees.length}</div></div>
      </div>
    </section> : <section className="bg-white border border-dashed border-slate-300 rounded-3xl p-8 text-center"><CalendarDays className="w-8 h-8 mx-auto text-cyan-500"/><h2 className="text-xl font-black text-slate-900 mt-3">No examination created yet</h2><p className="text-sm text-slate-500 mt-1">Create an examination to start building its timetable, rooms and seating.</p><button onClick={() => onNavigate('examinations')} className="mt-4 px-4 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-bold">Create Examination</button></section>}

    {/* Examination-specific stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats.map((s, i) => { const Icon = s.icon; return <button key={i} onClick={() => onNavigate(s.tab)} className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider font-black text-slate-400">{s.label}</span><span className={`p-2 rounded-xl border ${s.color}`}><Icon className="w-4 h-4"/></span></div><div className="text-2xl font-black text-slate-900 mt-4">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div></button>})}</div>

    {/* Today's examination */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100"><div><h3 className="text-base font-black text-slate-900">Today's Examination</h3><p className="text-xs text-slate-500 mt-1">{formatDate(todayStr)}</p></div><button onClick={() => onNavigate('examinations')} className="text-sm font-bold text-cyan-700">View schedule <ArrowRight className="inline w-4 h-4 ml-1"/></button></div>
        <div className="mt-4 space-y-2">{todaysSessions.length === 0 ? <div className="py-9 text-center text-sm text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No examination sessions scheduled for today.</div> : todaysSessions.map(sess => <div key={sess.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100"><div><div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-cyan-600"/><h4 className="text-sm font-black text-slate-900">{sess.time || 'Scheduled session'}</h4></div><p className="text-xs text-slate-500 mt-1">{sess.classConfigs.length} classes involved</p></div><button onClick={() => onSelectSessionForGenerator(sess.id)} className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Open Seating</button></div>)}</div>
      </section>

      {/* Exam progress */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><div className="pb-4 border-b border-slate-100"><h3 className="text-base font-black text-slate-900">Examination Progress</h3><p className="text-xs text-slate-500 mt-1">Workflow for the current examination</p></div><div className="mt-4 space-y-3">{[['Timetable', currentExam ? 'Ready to configure' : '—'], ['Rooms', currentExam ? 'Ready to configure' : '—'], ['Seating', currentExam ? 'Ready to generate' : '—'], ['Invigilation', currentExam ? 'Ready to assign' : '—'], ['Attendance', currentExam ? 'Ready to record' : '—'], ['Reports', currentExam ? 'Available after data' : '—']].map(([label,state],i)=><div key={label} className="flex items-center gap-3"><span className={`w-7 h-7 rounded-full flex items-center justify-center ${i<3?'bg-cyan-50 text-cyan-600':'bg-slate-100 text-slate-400'}`}>{i<3?<CheckCircle2 className="w-4 h-4"/>:<span className="text-[10px] font-black">{i+1}</span>}</span><div className="min-w-0"><div className="text-xs font-bold text-slate-800">{label}</div><div className="text-[10px] text-slate-400">{state}</div></div></div>)}</div></section>
    </div>

    {/* Quick actions */}
    <section><div className="mb-3"><h3 className="text-base font-black text-slate-900">Examination Actions</h3><p className="text-xs text-slate-500 mt-1">Jump directly to the work you need to complete.</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[
      ['Timetable','Build the examination schedule',CalendarDays,'examinations'],['Seating','Generate room seating',Users,'examinations'],['Invigilation','Assign invigilators',Users,'examinations'],['Reports','Print and export reports',ClipboardList,'examinations']
    ].map(([title,text,Icon,tab]:any)=><button key={title} onClick={()=>onNavigate(tab)} className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-cyan-200 hover:shadow-md transition"><span className="inline-flex p-2.5 rounded-xl bg-cyan-50 text-cyan-600"><Icon className="w-5 h-5"/></span><h4 className="font-black text-sm text-slate-900 mt-4">{title}</h4><p className="text-xs text-slate-500 mt-1">{text}</p><span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 mt-4">Open <ArrowRight className="w-3.5 h-3.5"/></span></button>)}</div></section>

    {/* Recent examinations */}
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><div className="flex items-center justify-between pb-4 border-b border-slate-100"><div><h3 className="text-base font-black text-slate-900">Recent Examinations</h3><p className="text-xs text-slate-500 mt-1">Examinations managed in this campus</p></div><button onClick={()=>onNavigate('examinations')} className="text-sm font-bold text-cyan-700">View all <ArrowRight className="inline w-4 h-4 ml-1"/></button></div><div className="mt-2 divide-y divide-slate-100">{recentExams.map(exam=>{const meta=statusMeta(exam.status);return <button key={exam.id} onClick={()=>onOpenExamination(exam)} className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 rounded-xl px-2 transition"><div className="min-w-0"><h4 className="text-sm font-black text-slate-900 truncate">{exam.name}</h4><p className="text-xs text-slate-500 mt-1">{formatDate(exam.startDate)} → {formatDate(exam.endDate)}</p></div><div className="flex items-center gap-3 shrink-0"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}/>{meta.label}</span><ArrowRight className="w-4 h-4 text-slate-300"/></div></button>})}{!recentExams.length&&<div className="py-8 text-center text-sm text-slate-400">No examinations yet.</div>}</div></section>

    {todaysAbsentees.length > 0 && <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm"><div className="flex items-center gap-3"><span className="p-2 rounded-xl bg-rose-50 text-rose-600"><AlertCircle className="w-4 h-4"/></span><div><h3 className="text-sm font-black text-slate-900">Today's Attendance</h3><p className="text-xs text-slate-500">{todaysAbsentees.length} absentee record{todaysAbsentees.length === 1 ? '' : 's'} recorded today.</p></div></div></section>}
  </div>;
};
