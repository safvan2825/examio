import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Filter, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AbsenteeRecord, ClassItem, Student, Subject } from '../types';

interface Props { records: AbsenteeRecord[]; students: Student[]; classes: ClassItem[]; subjects: Subject[]; }
type ReportType = 'student' | 'class' | 'subject' | 'date' | 'range' | 'custom';
const labelFor = (type: ReportType) => ({student:'Student-wise',class:'Class-wise',subject:'Class + Subject-wise',date:'Date-wise',range:'Date-range',custom:'Custom / Combined'}[type]);

export const ReportsView: React.FC<Props> = ({ records, students, classes, subjects }) => {
  const [type, setType] = useState<ReportType>('class');
  const [studentId, setStudentId] = useState(''); const [classId, setClassId] = useState(''); const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [query, setQuery] = useState('');
  const filtered = useMemo(() => records.filter(r => {
    const studentMatch = !studentId || r.studentId === studentId; const classMatch = !classId || r.classId === classId;
    const subjectMatch = !subjectId || r.subjectId === subjectId; const dateMatch = !date || r.date === date;
    const fromMatch = !from || r.date >= from; const toMatch = !to || r.date <= to;
    const qMatch = !query || `${r.studentName} ${r.admissionNo} ${r.className} ${r.subjectName}`.toLowerCase().includes(query.toLowerCase());
    if (type === 'student') return studentMatch; if (type === 'class') return classMatch;
    if (type === 'subject') return classMatch && subjectMatch; if (type === 'date') return dateMatch;
    if (type === 'range') return fromMatch && toMatch;
    return studentMatch && classMatch && subjectMatch && dateMatch && fromMatch && toMatch && qMatch;
  }), [records, type, studentId, classId, subjectId, date, from, to, query]);
  const rows = filtered.map((r,i)=>[i+1,r.className,r.studentName,r.admissionNo,r.subjectName,r.date]);
  const title = `${labelFor(type)} Absentee Report`;
  const exportExcel = () => {
    const data = filtered.map((r,i)=>({ 'SI.NO':i+1, CLASS:r.className, 'STUDENT NAME':r.studentName, 'ADMISSION NO.':r.admissionNo, SUBJECT:r.subjectName, DATE:r.date }));
    const ws = XLSX.utils.json_to_sheet(data); (ws as any)['!freeze']={xSplit:0,ySplit:1}; (ws as any)['!cols']=[{wch:8},{wch:18},{wch:30},{wch:16},{wch:22},{wch:14}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Absentee Report'); XLSX.writeFile(wb,`Absentee_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const exportPdf = () => {
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text('Noorul Huda Examination Board',148.5,12,{align:'center'});
    doc.setFontSize(11); doc.text(title,148.5,19,{align:'center'}); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(`Total Records: ${filtered.length} | Generated: ${new Date().toLocaleString()}`,148.5,25,{align:'center'});
    autoTable(doc,{startY:30,head:[['SI.NO','CLASS','STUDENT NAME','ADMISSION NO.','SUBJECT','DATE']],body:rows,theme:'grid',headStyles:{fontSize:8,fontStyle:'bold'},bodyStyles:{fontSize:8},styles:{cellPadding:2},margin:{left:10,right:10}});
    doc.save(`Absentee_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };
  const clear=()=>{setStudentId('');setClassId('');setSubjectId('');setDate('');setFrom('');setTo('');setQuery('');};
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-900">Reports</h1><p className="text-xs text-slate-500 mt-1">Generate reports from live Firebase absentee records.</p></div><div className="text-xs font-bold text-slate-600">{filtered.length.toLocaleString()} matching records</div></div>
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold"><Filter className="w-4 h-4 text-blue-600"/>Report Type</div>
      <select value={type} onChange={e=>setType(e.target.value as ReportType)} className="w-full md:w-72 border rounded-lg px-3 py-2.5 text-sm"><option value="student">Student-wise</option><option value="class">Class-wise</option><option value="subject">Class + Subject-wise</option><option value="date">Date-wise</option><option value="range">Date-range</option><option value="custom">Custom / Combined</option></select>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {(type==='student'||type==='custom') && <select value={studentId} onChange={e=>setStudentId(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"><option value="">All Students</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} — {s.admissionNo}</option>)}</select>}
        {type!=='student' && <select value={classId} onChange={e=>setClassId(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"><option value="">All Classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        {(type==='subject'||type==='custom') && <select value={subjectId} onChange={e=>setSubjectId(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"><option value="">All Subjects</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}
        {(type==='date'||type==='custom') && <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"/>}
        {type==='range' && <><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"/><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"/></>}
        {type==='custom' && <><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"/><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded-lg px-3 py-2.5 text-xs"/><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search anything…" className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-xs"/></div></>}
      </div>
      <div className="flex gap-2"><button onClick={clear} className="px-4 py-2 text-xs font-bold border rounded-lg text-slate-600">Clear Filters</button><button onClick={exportPdf} disabled={!filtered.length} className="px-4 py-2 text-xs font-bold bg-rose-600 disabled:opacity-40 text-white rounded-lg flex items-center gap-2"><FileText className="w-4 h-4"/>Download PDF</button><button onClick={exportExcel} disabled={!filtered.length} className="px-4 py-2 text-xs font-bold bg-emerald-600 disabled:opacity-40 text-white rounded-lg flex items-center gap-2"><FileSpreadsheet className="w-4 h-4"/>Download Excel</button></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"><div className="p-4 border-b border-slate-100"><h2 className="font-bold text-sm">{title}</h2><p className="text-[11px] text-slate-500 mt-1">The downloaded files contain exactly the records shown below.</p></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3 text-left">SI.NO</th><th className="px-4 py-3 text-left">CLASS</th><th className="px-4 py-3 text-left">STUDENT NAME</th><th className="px-4 py-3 text-left">ADMISSION NO.</th><th className="px-4 py-3 text-left">SUBJECT</th><th className="px-4 py-3 text-left">DATE</th></tr></thead><tbody>{filtered.slice(0,300).map((r,i)=><tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-3 text-xs text-slate-500">{i+1}</td><td className="px-4 py-3 text-xs font-semibold">{r.className}</td><td className="px-4 py-3 text-sm font-semibold">{r.studentName}</td><td className="px-4 py-3 text-xs">{r.admissionNo}</td><td className="px-4 py-3 text-xs">{r.subjectName}</td><td className="px-4 py-3 text-xs">{r.date}</td></tr>)}{!filtered.length&&<tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">No records match the selected filters.</td></tr>}</tbody></table></div>{filtered.length>300&&<div className="p-3 text-center text-[11px] text-slate-500 border-t">Preview shows first 300 records; exports contain all {filtered.length.toLocaleString()} records.</div>}</div>
  </div>;
};
