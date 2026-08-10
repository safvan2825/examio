import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Edit3, Filter, Search, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { AbsenteeRecord, ClassItem, Student, Subject } from '../types';

interface Props {
  students: Student[];
  classes: ClassItem[];
  subjects: Subject[];
  records: AbsenteeRecord[];
  onSaveRecords: (records: AbsenteeRecord[]) => Promise<void>;
  onSaveRecord: (record: AbsenteeRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);
const recordId = (studentId: string, subjectId: string, date: string) => `${studentId}__${subjectId}__${date}`.replace(/[^a-zA-Z0-9_-]/g, '_');

export const AbsenteesView: React.FC<Props> = ({ students, classes, subjects, records, onSaveRecords, onSaveRecord, onDeleteRecord }) => {
  const [tab, setTab] = useState<'entry' | 'records'>('entry');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Student[]>([]);
  const [message, setMessage] = useState<{type:'success'|'error'; text:string} | null>(null);
  const [saving, setSaving] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordClass, setRecordClass] = useState('');
  const [recordSubject, setRecordSubject] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [editing, setEditing] = useState<AbsenteeRecord | null>(null);

  const selectedClass = classes.find(c => c.id === classId);
  const selectedSubject = subjects.find(s => s.id === subjectId);
  const classStudents = useMemo(() => students.filter(s => s.classId === classId), [students, classId]);
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!classId || !q) return [];
    return classStudents.filter(s => s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)).filter(s => !pending.some(p => p.id === s.id)).slice(0, 8);
  }, [classStudents, search, classId, pending]);

  const addStudent = (student: Student) => {
    if (!selectedSubject) return;
    const alreadySaved = records.some(r => r.studentId === student.id && r.subjectId === subjectId && r.date === date);
    if (alreadySaved) {
      setMessage({ type: 'error', text: `${student.name} is already marked absent for ${selectedSubject.name} on ${date}.` });
      setSearch(''); return;
    }
    setPending(prev => [...prev, student]); setSearch(''); setMessage(null);
  };

  const savePending = async () => {
    if (!classId || !subjectId || !date) return setMessage({type:'error',text:'Select Class, Subject and Date first.'});
    if (!pending.length) return setMessage({type:'error',text:'Add at least one absent student.'});
    const now = new Date().toISOString();
    const duplicates = pending.filter(s => records.some(r => r.studentId === s.id && r.subjectId === subjectId && r.date === date));
    if (duplicates.length) return setMessage({type:'error',text:`${duplicates.length} student(s) are already recorded for this subject and date.`});
    const batch = pending.map(s => ({ id: recordId(s.id, subjectId, date), studentId:s.id, admissionNo:s.admissionNo, studentName:s.name, classId, className:selectedClass?.name || '', subjectId, subjectName:selectedSubject?.name || '', date, createdAt:now, updatedAt:now }));
    setSaving(true); setMessage(null);
    try { await onSaveRecords(batch); setPending([]); setSearch(''); setMessage({type:'success',text:`${batch.length} absentee record${batch.length === 1 ? '' : 's'} saved successfully.`}); }
    catch (e:any) { setMessage({type:'error',text:'Unable to save records. Please check your connection and try again.'}); }
    finally { setSaving(false); }
  };

  const filteredRecords = useMemo(() => records.filter(r =>
    (!recordSearch || r.studentName.toLowerCase().includes(recordSearch.toLowerCase()) || r.admissionNo.toLowerCase().includes(recordSearch.toLowerCase())) &&
    (!recordClass || r.classId === recordClass) && (!recordSubject || r.subjectId === recordSubject) && (!recordDate || r.date === recordDate)
  ), [records, recordSearch, recordClass, recordSubject, recordDate]);

  const beginEdit = (r: AbsenteeRecord) => setEditing(r);
  const saveEdit = async () => {
    if (!editing) return;
    const newId = recordId(editing.studentId, editing.subjectId, editing.date);
    const duplicate = records.some(r => r.id !== editing.id && r.studentId === editing.studentId && r.subjectId === editing.subjectId && r.date === editing.date);
    if (duplicate) return setMessage({type:'error',text:'Another absentee record already exists for this student, subject and date.'});
    try {
      await onSaveRecord({...editing, id:newId, updatedAt:new Date().toISOString()});
      if (newId !== editing.id) await onDeleteRecord(editing.id);
      setEditing(null); setMessage({type:'success',text:'Absentee record updated successfully.'});
    } catch { setMessage({type:'error',text:'Unable to update the record. Your data was not cleared.'}); }
  };

  return <div className="space-y-5">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-slate-900">Absentee Records</h1><p className="text-xs text-slate-500 mt-1">Class → Subject → Date → Search Student → Select → Save.</p></div>
      <div className="flex bg-white border border-slate-200 rounded-lg p-1"><button onClick={()=>setTab('entry')} className={`px-4 py-2 text-xs font-bold rounded-md ${tab==='entry'?'bg-slate-900 text-white':'text-slate-500'}`}>Absentee Entry</button><button onClick={()=>setTab('records')} className={`px-4 py-2 text-xs font-bold rounded-md ${tab==='records'?'bg-slate-900 text-white':'text-slate-500'}`}>Saved Records ({records.length})</button></div>
    </div>

    {message && <div className={`rounded-lg px-4 py-3 text-xs font-semibold flex items-center gap-2 ${message.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-rose-50 text-rose-700 border border-rose-200'}`}>{message.type==='success'?<CheckCircle2 className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}{message.text}</div>}

    {tab==='entry' ? <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-xs font-bold text-slate-600">CLASS<select value={classId} onChange={e=>{setClassId(e.target.value);setPending([]);setSearch('')}} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Class</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">SUBJECT<select value={subjectId} onChange={e=>setSubjectId(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-blue-500"><option value="">Select Subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">DATE<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-blue-500" /></label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3"><Search className="w-4 h-4 text-blue-600"/>Search Absent Student</div>
        <div className="relative"><input disabled={!classId} value={search} onChange={e=>setSearch(e.target.value)} placeholder={classId?'Type student name or admission number…':'Select a class first'} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" />
          {suggestions.length>0 && <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">{suggestions.map(s=><button key={s.id} onClick={()=>addStudent(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0"><div className="text-sm font-bold text-slate-800">{s.name}</div><div className="text-[11px] text-slate-500 mt-0.5">Admission No: {s.admissionNo} · Class: {selectedClass?.name}</div></button>)}</div>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div><h2 className="text-sm font-bold">Current Absentees</h2><p className="text-[11px] text-slate-500 mt-0.5">{selectedClass?.name || '—'} · {selectedSubject?.name || '—'} · {date}</p></div><span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">Total: {pending.length}</span></div>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3 text-left">SI.NO</th><th className="px-4 py-3 text-left">STUDENT NAME</th><th className="px-4 py-3 text-left">AD. NO.</th><th className="px-4 py-3 text-right">ACTION</th></tr></thead><tbody>{pending.map((s,i)=><tr key={s.id} className="border-t border-slate-100"><td className="px-4 py-3 text-xs text-slate-500">{i+1}</td><td className="px-4 py-3 text-sm font-semibold">{s.name}</td><td className="px-4 py-3 text-sm">{s.admissionNo}</td><td className="px-4 py-3 text-right"><button onClick={()=>setPending(p=>p.filter(x=>x.id!==s.id))} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button></td></tr>)}{!pending.length&&<tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">No students added yet. Search above to add absent students.</td></tr>}</tbody></table></div>
        <div className="p-4 border-t border-slate-100 flex justify-end"><button disabled={saving || !pending.length} onClick={savePending} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-2"><Save className="w-4 h-4"/>{saving?'Saving…':'Save Absentee Record'}</button></div>
      </div>
    </div> : <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3"><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3"/><input value={recordSearch} onChange={e=>setRecordSearch(e.target.value)} placeholder="Student name / admission no." className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-xs"/></div><select value={recordClass} onChange={e=>setRecordClass(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"><option value="">All Classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={recordSubject} onChange={e=>setRecordSubject(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"><option value="">All Subjects</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="date" value={recordDate} onChange={e=>setRecordDate(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"/></div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3 text-left">SI.NO</th><th className="px-4 py-3 text-left">CLASS</th><th className="px-4 py-3 text-left">STUDENT</th><th className="px-4 py-3 text-left">AD. NO.</th><th className="px-4 py-3 text-left">SUBJECT</th><th className="px-4 py-3 text-left">DATE</th><th className="px-4 py-3 text-right">ACTION</th></tr></thead><tbody>{filteredRecords.map((r,i)=><tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-3 text-xs text-slate-500">{i+1}</td><td className="px-4 py-3 text-xs font-semibold">{r.className}</td><td className="px-4 py-3 text-sm font-semibold">{r.studentName}</td><td className="px-4 py-3 text-xs">{r.admissionNo}</td><td className="px-4 py-3 text-xs">{r.subjectName}</td><td className="px-4 py-3 text-xs">{r.date}</td><td className="px-4 py-3 text-right"><button onClick={()=>beginEdit(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4"/></button><button onClick={async()=>{if(confirm('Delete this absentee record?')) await onDeleteRecord(r.id)}} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button></td></tr>)}{!filteredRecords.length&&<tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">No matching absentee records.</td></tr>}</tbody></table></div></div>
    </div>}

    {editing && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"><div className="bg-white rounded-xl w-full max-w-lg p-5 shadow-2xl"><div className="flex justify-between items-center mb-4"><h2 className="font-bold">Edit Absentee Record</h2><button onClick={()=>setEditing(null)}><X className="w-5 h-5 text-slate-400"/></button></div><div className="space-y-3"><label className="block text-xs font-bold">Student<select value={editing.studentId} onChange={e=>{const s=students.find(x=>x.id===e.target.value);if(s)setEditing({...editing,studentId:s.id,studentName:s.name,admissionNo:s.admissionNo,classId:s.classId,className:classes.find(c=>c.id===s.classId)?.name||''})}} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm">{students.map(s=><option key={s.id} value={s.id}>{s.name} — {s.admissionNo}</option>)}</select></label><label className="block text-xs font-bold">Subject<select value={editing.subjectId} onChange={e=>{const s=subjects.find(x=>x.id===e.target.value);if(s)setEditing({...editing,subjectId:s.id,subjectName:s.name})}} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm">{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="block text-xs font-bold">Date<input type="date" value={editing.date} onChange={e=>setEditing({...editing,date:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2.5 text-sm"/></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setEditing(null)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button onClick={saveEdit} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Save Changes</button></div></div></div>}
  </div>;
};
