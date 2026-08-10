import React, { useMemo, useState } from 'react';
import { BookOpen, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { Subject } from '../types';

interface Props {
  subjects: Subject[];
  onSave: (subject: Subject) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const SubjectsView: React.FC<Props> = ({ subjects, onSave, onDelete }) => {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Subject | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => subjects.filter(s => s.name.toLowerCase().includes(query.toLowerCase())), [subjects, query]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return setError('Subject name is required.');
    const duplicate = subjects.some(s => s.name.trim().toLowerCase() === cleanName.toLowerCase() && s.id !== editing?.id);
    if (duplicate) return setError('This subject already exists.');
    setSaving(true); setError('');
    try {
      const now = new Date().toISOString();
      await onSave(editing ? { ...editing, name: cleanName, updatedAt: now } : { id: crypto.randomUUID(), name: cleanName, createdAt: now, updatedAt: now });
      setName(''); setEditing(null);
    } catch (err: any) { setError(err?.message || 'Unable to save subject.'); }
    finally { setSaving(false); }
  };

  const startEdit = (subject: Subject) => { setEditing(subject); setName(subject.name); setError(''); };
  const cancel = () => { setEditing(null); setName(''); setError(''); };

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-xl font-bold text-slate-900">Subjects</h1><p className="text-xs text-slate-500 mt-1">Permanent master list used by absentee entry and reports.</p></div>
      <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-2"><BookOpen className="w-4 h-4" />{subjects.length} Subjects</div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-sm">{editing ? 'Edit Subject' : 'Add Subject'}</h2>{editing && <button type="button" onClick={cancel}><X className="w-4 h-4 text-slate-400" /></button>}</div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject Name</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mathematics" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        <button disabled={saving} className="mt-4 w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" />{saving ? 'Saving…' : editing ? 'Update Subject' : 'Save Subject'}</button>
      </form>

      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3"><Search className="w-4 h-4 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search subjects…" className="flex-1 outline-none text-sm" /></div>
        <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3">SI.NO</th><th className="px-4 py-3">SUBJECT</th><th className="px-4 py-3 text-right">ACTION</th></tr></thead><tbody>
          {filtered.map((s, i) => <tr key={s.id} className="border-t border-slate-100"><td className="px-4 py-3 text-xs text-slate-500">{i + 1}</td><td className="px-4 py-3 text-sm font-semibold text-slate-800">{s.name}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit3 className="w-4 h-4" /></button><button onClick={async () => { if (confirm(`Delete ${s.name}?`)) await onDelete(s.id); }} className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}
          {!filtered.length && <tr><td colSpan={3} className="p-10 text-center text-sm text-slate-400">No subjects found.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  </div>;
};
