import React,{useEffect,useState} from 'react';
import {User} from 'firebase/auth';
import {subscribeAuth,logoutUser} from './lib/auth';
import {subscribeCampuses,setSelectedCampus,getSelectedCampus,clearSelectedCampus,subscribeExaminations,migrateLegacyDataToCampus} from './lib/tenant';
import * as dbApi from './lib/realtime';
import * as attendanceApi from './lib/attendance';
import {AccountGate} from './components/AccountGate';
import {CampusHome} from './components/CampusHome';
import {ExaminationWorkspace} from './components/ExaminationWorkspace';
import {AppSidebar,ShellTab} from './components/AppSidebar';
import {DashboardView} from './components/DashboardView';
import {CategoriesView} from './components/CategoriesView';
import {ClassesView} from './components/ClassesView';
import {StudentsView} from './components/StudentsView';
import {SubjectsView} from './components/SubjectsView';
import {RoomsView} from './components/RoomsView';
import {SettingsView} from './components/SettingsView';
import {Category,ClassItem,Student,Room,ExamSession,SeatingArrangement,Subject,AbsenteeRecord} from './types';
import {Campus,Examination} from './types/tenant';

const arr=<T,>(v:unknown):T[]=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v) as T[]:[]);
const normSession=(x:ExamSession):ExamSession=>({...x,classConfigs:arr(x.classConfigs)});
const normRoom=(x:Room):Room=>({...x,sides:x.sides===undefined?undefined:arr<any>(x.sides),onlineSlots:x.onlineSlots===undefined?undefined:arr<string>(x.onlineSlots)});
const normArrangement=(x:SeatingArrangement):SeatingArrangement=>({...x,manualAllocations:arr(x.manualAllocations),onlineAllocations:arr(x.onlineAllocations),roomDiagrams:arr<any>(x.roomDiagrams).map(d=>({...d,sides:arr<any>(d.sides).map(s=>({...s,grid:arr<any>(s.grid).map((r:any)=>arr<any>(r))})),classSummary:arr<any>(d.classSummary)})),roomSummaries:arr<any>(x.roomSummaries)});

export default function App(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[campuses,setCampuses]=useState<Campus[]>([]),[campus,setCampus]=useState<Campus|null>(null),[exams,setExams]=useState<Examination[]>([]),[exam,setExam]=useState<Examination|null>(null),[tab,setTab]=useState<ShellTab>('dashboard');
 const [categories,setCategories]=useState<Category[]>([]),[classes,setClasses]=useState<ClassItem[]>([]),[students,setStudents]=useState<Student[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[absentees,setAbsentees]=useState<AbsenteeRecord[]>([]),[rooms,setRooms]=useState<Room[]>([]),[sessions,setSessions]=useState<ExamSession[]>([]),[arrangements,setArrangements]=useState<SeatingArrangement[]>([]);
 useEffect(()=>subscribeAuth(u=>{setUser(u);setReady(true)}),[]);
 useEffect(()=>{if(!user){setCampuses([]);return}return subscribeCampuses(user.uid,setCampuses)},[user]);
 useEffect(()=>{if(!user)return;const id=getSelectedCampus();const found=campuses.find(c=>c.id===id);if(found)setCampus(found)},[user,campuses]);
 useEffect(()=>{if(!user||!campus)return;let active=true;(async()=>{try{await migrateLegacyDataToCampus(campus.id)}catch(e){console.warn('Legacy data migration skipped',e)}if(active)setSelectedCampus(campus.id)})();return()=>{active=false}},[user,campus?.id]);
 useEffect(()=>{if(!user||!campus)return;const a=dbApi.subscribeCategories(setCategories),b=dbApi.subscribeClasses(setClasses),c=dbApi.subscribeStudents(setStudents),d=dbApi.subscribeRooms(x=>setRooms(x.map(normRoom))),e=attendanceApi.subscribeSubjects(setSubjects),f=attendanceApi.subscribeAbsenteeRecords(setAbsentees),g=dbApi.subscribeSessions(x=>setSessions(x.map(normSession))),h=dbApi.subscribeSeatingArrangements(x=>setArrangements(x.map(normArrangement)));return()=>{a();b();c();d();e();f();g();h()}},[user,campus?.id]);
 useEffect(()=>{if(!user||!campus)return;return subscribeExaminations(user.uid,campus.id,setExams)},[user,campus?.id]);
 if(!ready)return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">Loading Examio…</div>;
 if(!user)return <AccountGate/>;
 const logout=async()=>{clearSelectedCampus();setCampus(null);setExam(null);await logoutUser()};
 const selectCampus=(c:Campus|null)=>{if(!c){clearSelectedCampus();setCampus(null);setExam(null);return}setSelectedCampus(c.id);setCampus(c);setExam(null);setTab('dashboard')};
 if(!campus)return <CampusHome uid={user.uid} campuses={campuses} exams={[]} selectedCampus={null} onCampusSelected={selectCampus} onRefresh={()=>{}} onOpenExam={setExam} onSignOut={logout}/>;
 if(exam)return <ExaminationWorkspace uid={user.uid} campus={campus} exam={exam} categories={categories} classes={classes} subjects={subjects} onBack={()=>setExam(null)}/>;
 return <div className="min-h-screen bg-slate-50 text-slate-800 flex"><AppSidebar activeTab={tab} onTabChange={setTab} campus={campus} campuses={campuses} onCampusChange={selectCampus} onMyCampuses={()=>selectCampus(null)} onLogout={logout}/><main className="flex-1 p-6 overflow-y-auto">
  {tab==='dashboard'&&<DashboardView categories={categories} classes={classes} students={students} subjects={subjects} absenteeRecords={absentees} rooms={rooms} sessions={sessions} onNavigate={()=>setTab('examinations')} onSelectSessionForGenerator={()=>setTab('examinations')}/>} 
  {tab==='categories'&&<CategoriesView categories={categories} classes={classes} rooms={rooms} onSaveCategory={dbApi.saveCategory} onDeleteCategory={dbApi.deleteCategory} onDeleteBulkCategories={dbApi.deleteBulkCategories}/>} 
  {tab==='classes'&&<ClassesView categories={categories} classes={classes} students={students} onSaveClassItem={dbApi.saveClassItem} onSaveBulkClasses={dbApi.saveBulkClasses} onDeleteClassItem={dbApi.deleteClassItem} onDeleteBulkClasses={dbApi.deleteBulkClasses}/>} 
  {tab==='students'&&<StudentsView students={students} classes={classes} onSaveStudent={dbApi.saveStudent} onSaveBulkStudents={dbApi.saveBulkStudents} onDeleteStudent={dbApi.deleteStudent} onDeleteBulkStudents={dbApi.deleteBulkStudents}/>} 
  {tab==='subjects'&&<SubjectsView subjects={subjects} onSave={attendanceApi.saveSubject} onDelete={attendanceApi.deleteSubject}/>} 
  {tab==='rooms'&&<RoomsView rooms={rooms} categories={categories} onSaveRoom={dbApi.saveRoom} onDeleteRoom={dbApi.deleteRoom} onDeleteBulkRooms={dbApi.deleteBulkRooms}/>} 
  {tab==='examinations'&&<CampusHome uid={user.uid} campuses={campuses} exams={exams} selectedCampus={campus} onCampusSelected={selectCampus} onRefresh={()=>{}} onOpenExam={setExam} onSignOut={logout}/>} 
  {tab==='settings'&&<SettingsView adminCredentials={{username:user.email||'admin',password:''}} onSeedDemoData={async()=>{}} onClearAllData={dbApi.clearAllData} onNavigate={()=>{}} onDataRestored={()=>{}}/>}
 </main></div>;
}
