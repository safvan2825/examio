import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CategoriesView } from './components/CategoriesView';
import { ClassesView } from './components/ClassesView';
import { StudentsView } from './components/StudentsView';
import { SubjectsView } from './components/SubjectsView';
import { AbsenteesView } from './components/AbsenteesView';
import { ReportsView } from './components/ReportsView';
import { RoomsView } from './components/RoomsView';
import { TimetableFolderView } from './components/TimetableFolderView';
import { SeatingGeneratorView } from './components/SeatingGeneratorView';
import { DutyManagementView } from './components/DutyManagementView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { PrintModalView } from './components/PrintModalView';
import { LoginView } from './components/LoginView';
import { subscribeCategories, subscribeClasses, subscribeStudents, subscribeRooms, subscribeSessions, subscribeSeatingArrangements, subscribeAdminCredentials, DEFAULT_CREDENTIALS, saveCategory, deleteCategory, deleteBulkCategories, saveClassItem, saveBulkClasses, deleteClassItem, deleteBulkClasses, saveStudent, saveBulkStudents, deleteStudent, deleteBulkStudents, saveRoom, deleteRoom, deleteBulkRooms, saveSession, deleteSession, saveSeatingArrangement, seedSampleData, clearAllData } from './lib/realtime';
import { subscribeSubjects, saveSubject, deleteSubject, subscribeAbsenteeRecords, saveAbsenteeRecords, saveAbsenteeRecord, deleteAbsenteeRecord } from './lib/attendance';
import { Category, ClassItem, Student, Room, ExamSession, SeatingArrangement, AdminCredentials, Subject, AbsenteeRecord } from './types';

const toArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : (value && typeof value === 'object' ? Object.values(value) as T[] : []);
const normalizeSession = (session: ExamSession): ExamSession => ({ ...session, classConfigs: toArray(session.classConfigs) });
const normalizeRoom = (room: Room): Room => ({ ...room, sides: room.sides === undefined ? undefined : toArray<any>(room.sides).map(side => ({...side})), onlineSlots: room.onlineSlots === undefined ? undefined : toArray<string>(room.onlineSlots) });
const normalizeArrangement = (arr: SeatingArrangement): SeatingArrangement => ({ ...arr, manualAllocations: toArray(arr.manualAllocations), onlineAllocations: toArray(arr.onlineAllocations), roomDiagrams: toArray<any>(arr.roomDiagrams).map(diagram => ({...diagram, sides: toArray<any>(diagram.sides).map(side => ({...side, grid: toArray<any>(side.grid).map(row => toArray<any>(row))})), classSummary: toArray<any>(diagram.classSummary)})), roomSummaries: toArray<any>(arr.roomSummaries) });

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(DEFAULT_CREDENTIALS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('nh_authenticated') === 'true');
  const [categories, setCategories] = useState<Category[]>([]); const [classes, setClasses] = useState<ClassItem[]>([]); const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]); const [absenteeRecords, setAbsenteeRecords] = useState<AbsenteeRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]); const [sessions, setSessions] = useState<ExamSession[]>([]); const [seatingArrangements, setSeatingArrangements] = useState<SeatingArrangement[]>([]);
  const [selectedGeneratorSessionId, setSelectedGeneratorSessionId] = useState('');
  const [printModalState, setPrintModalState] = useState<{isOpen:boolean;type:'roomDiagram'|'studentList';session?:ExamSession;arrangement?:SeatingArrangement}>({isOpen:false,type:'roomDiagram'});
  useEffect(()=>subscribeAdminCredentials(setAdminCredentials),[]);
  useEffect(()=>{const online=()=>setIsOnline(true),offline=()=>setIsOnline(false);window.addEventListener('online',online);window.addEventListener('offline',offline);return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline)}},[]);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setActiveTab('search')}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[]);
  useEffect(()=>{const a=subscribeCategories(setCategories),b=subscribeClasses(setClasses),c=subscribeStudents(setStudents),d=subscribeRooms(data=>setRooms(data.map(normalizeRoom))),e=subscribeSessions(data=>setSessions(data.map(normalizeSession))),f=subscribeSeatingArrangements(data=>setSeatingArrangements(data.map(normalizeArrangement))),g=subscribeSubjects(setSubjects),h=subscribeAbsenteeRecords(setAbsenteeRecords);return()=>{a();b();c();d();e();f();g();h()}},[]);
  useEffect(()=>{if(!selectedGeneratorSessionId&&sessions.length)setSelectedGeneratorSessionId(sessions[0].id);else if(selectedGeneratorSessionId&&sessions.length&&!sessions.some(s=>s.id===selectedGeneratorSessionId))setSelectedGeneratorSessionId(sessions[0].id)},[sessions,selectedGeneratorSessionId]);
  const handleLoginSuccess=()=>{localStorage.setItem('nh_authenticated','true');setIsAuthenticated(true)}; const handleLogout=()=>{localStorage.removeItem('nh_authenticated');setIsAuthenticated(false)};
  const handleSelectSessionForGenerator=(id:string)=>{setSelectedGeneratorSessionId(id);setActiveTab('generator')}; const handleOpenPrintModal=(type:'roomDiagram'|'studentList',session:ExamSession,arrangement:SeatingArrangement)=>setPrintModalState({isOpen:true,type,session,arrangement});
  if(!isAuthenticated)return <LoginView adminCredentials={adminCredentials} onLoginSuccess={handleLoginSuccess}/>;
  return <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex selection:bg-blue-600 selection:text-white"><Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}/><main className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6">
    {activeTab==='dashboard'&&<DashboardView categories={categories} classes={classes} students={students} subjects={subjects} absenteeRecords={absenteeRecords} rooms={rooms} sessions={sessions} onNavigate={setActiveTab} onSelectSessionForGenerator={handleSelectSessionForGenerator}/>} 
    {activeTab==='categories'&&<CategoriesView categories={categories} classes={classes} rooms={rooms} onSaveCategory={saveCategory} onDeleteCategory={deleteCategory} onDeleteBulkCategories={deleteBulkCategories}/>} 
    {activeTab==='classes'&&<ClassesView categories={categories} classes={classes} students={students} onSaveClassItem={saveClassItem} onSaveBulkClasses={saveBulkClasses} onDeleteClassItem={deleteClassItem} onDeleteBulkClasses={deleteBulkClasses}/>} 
    {activeTab==='students'&&<StudentsView students={students} classes={classes} onSaveStudent={saveStudent} onSaveBulkStudents={saveBulkStudents} onDeleteStudent={deleteStudent} onDeleteBulkStudents={deleteBulkStudents}/>} 
    {activeTab==='subjects'&&<SubjectsView subjects={subjects} onSave={saveSubject} onDelete={deleteSubject}/>} 
    {activeTab==='absentees'&&<AbsenteesView students={students} classes={classes} subjects={subjects} records={absenteeRecords} onSaveRecords={saveAbsenteeRecords} onSaveRecord={saveAbsenteeRecord} onDeleteRecord={deleteAbsenteeRecord}/>} 
    {activeTab==='reports'&&<ReportsView records={absenteeRecords} students={students} classes={classes} subjects={subjects}/>} 
    {activeTab==='rooms'&&<RoomsView rooms={rooms} categories={categories} onSaveRoom={saveRoom} onDeleteRoom={deleteRoom} onDeleteBulkRooms={deleteBulkRooms}/>} 
    {activeTab==='timetable'&&<TimetableFolderView sessions={sessions} classes={classes} onSaveSession={saveSession} onDeleteSession={deleteSession} onSelectSessionForGenerator={handleSelectSessionForGenerator}/>} 
    {activeTab==='generator'&&<SeatingGeneratorView sessions={sessions} students={students} classes={classes} categories={categories} rooms={rooms} arrangements={seatingArrangements} selectedSessionIdFromNav={selectedGeneratorSessionId||sessions[0]?.id||''} onSaveArrangement={saveSeatingArrangement} onOpenPrintModal={handleOpenPrintModal}/>} 
    {activeTab==='duty'&&<DutyManagementView/>}
    {activeTab==='search'&&<SearchView students={students} classes={classes} categories={categories} rooms={rooms} sessions={sessions} arrangements={seatingArrangements}/>} 
    {activeTab==='settings'&&<SettingsView adminCredentials={adminCredentials} onSeedDemoData={seedSampleData} onClearAllData={clearAllData} onNavigate={setActiveTab} onDataRestored={()=>{}}/>}
  </main>{printModalState.isOpen&&printModalState.session&&printModalState.arrangement&&<PrintModalView type={printModalState.type} session={printModalState.session} arrangement={printModalState.arrangement} categories={categories} classes={classes} onClose={()=>setPrintModalState({...printModalState,isOpen:false})}/>} {!isOnline&&<div className="fixed bottom-4 right-4 bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded-lg text-xs font-semibold shadow-lg">Offline — Firebase changes may fail until connection returns.</div>}</div>;
}
