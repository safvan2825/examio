import React,{useEffect,useState} from 'react';
import {User} from 'firebase/auth';
import {subscribeAuth,logoutUser} from './lib/auth';
import {subscribeCampuses,setSelectedCampus,getSelectedCampus,clearSelectedCampus,subscribeExaminations} from './lib/tenant';
import * as dbApi from './lib/realtime';
import * as attendanceApi from './lib/attendance';
import {AccountGate} from './components/AccountGate';
import {CampusHome} from './components/CampusHome';
import {ExaminationWorkspace} from './components/ExaminationWorkspace';
import {ExaminationsView} from './components/ExaminationsView';
import {AppSidebarV2,ShellTab} from './components/AppSidebarV2';
import {DashboardView} from './components/DashboardView';
import {CategoriesView} from './components/CategoriesView';
import {ClassesView} from './components/ClassesView';
import {StudentsView} from './components/StudentsView';
import {SubjectsView} from './components/SubjectsView';
import {SettingsView} from './components/SettingsView';
import {PrintModalView} from './components/PrintModalView';
import {Category,ClassItem,Student,ExamSession,SeatingArrangement,Subject,AbsenteeRecord,Room} from './types';
import {Campus,Examination} from './types/tenant';

const arr=<T,>(v:unknown):T[]=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v) as T[]:[]);
const normSession=(x:ExamSession):ExamSession=>({...x,classConfigs:arr(x.classConfigs)});
const normArrangement=(x:SeatingArrangement):SeatingArrangement=>({...x,manualAllocations:arr(x.manualAllocations),onlineAllocations:arr(x.onlineAllocations),roomDiagrams:arr<any>(x.roomDiagrams).map(d=>({...d,sides:arr<any>(d.sides).map(s=>({...s,grid:arr<any>(s.grid).map((r:any)=>arr<any>(r))})),classSummary:arr<any>(d.classSummary)})),roomSummaries:arr<any>(x.roomSummaries)});
type PrintRequest={type:'roomDiagram'|'studentList';session:ExamSession;arrangement:SeatingArrangement};

export default function App(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[campuses,setCampuses]=useState<Campus[]>([]),[campus,setCampus]=useState<Campus|null>(null),[exams,setExams]=useState<Examination[]>([]),[exam,setExam]=useState<Examination|null>(null),[tab,setTab]=useState<ShellTab>('dashboard'),[printRequest,setPrintRequest]=useState<PrintRequest|null>(null);
 const [categories,setCategories]=useState<Category[]>([]),[classes,setClasses]=useState<ClassItem[]>([]),[students,setStudents]=useState<Student[]>([]),[subjects,setSubjects]=useState<Subject[]>([]),[absentees,setAbsentees]=useState<AbsenteeRecord[]>([]),[examRooms,setExamRooms]=useState<Room[]>([]),[sessions,setSessions]=useState<ExamSession[]>([]),[arrangements,setArrangements]=useState<SeatingArrangement[]>([]);
 useEffect(()=>subscribeAuth(u=>{setUser(u);setReady(true)}),[]);
 useEffect(()=>{if(!user){setCampuses([]);return}return subscribeCampuses(user.uid,setCampuses)},[user]);
 useEffect(()=>{if(!user||!campus)return;const id=getSelectedCampus();const found=campuses.find(c=>c.id===id);if(found)setCampus(found)},[user,campuses]);
 useEffect(()=>{if(!user||!campus)return;const a=dbApi.subscribeCategories(setCategories),b=dbApi.subscribeClasses(setClasses),c=dbApi.subscribeStudents(setStudents),d=attendanceApi.subscribeSubjects(setSubjects),e=attendanceApi.subscribeAbsenteeRecords(setAbsentees),f=dbApi.subscribeSessions(x=>setSessions(x.map(normSession))),g=dbApi.subscribeSeatingArrangements(x=>setArrangements(x.map(normArrangement)));return()=>{a();b();c();d();e();f();g()}},[user,campus?.id]);
 useEffect(()=>{if(!user||!campus)return;return subscribeExaminations(user.uid,campus.id,setExams)},[user,campus?.id]);
 useEffect(()=>{if(!exam){setExamRooms([]);return}return dbApi.subscribeExamRooms(exam.id,setExamRooms)},[exam?.id]);
 if(!ready)return <div className="examio-loading">Loading Examio…</div>;
 if(!user)return <AccountGate/>;
 const logout=async()=>{clearSelectedCampus();setCampus(null);setExam(null);setPrintRequest(null);setExamRooms([]);await logoutUser()};
 const selectCampus=(c:Campus|null)=>{if(!c){clearSelectedCampus();setCampus(null);setExam(null);setPrintRequest(null);setExamRooms([]);return}setSelectedCampus(c.id);setCampus(c);setExam(null);setExamRooms([]);setPrintRequest(null);setTab('dashboard')};
 const openExam=(x:Examination)=>{setExam({...x});setPrintRequest(null);setTab('dashboard')};
 if(!campus)return <CampusHome uid={user.uid} campuses={campuses} exams={[]} selectedCampus={null} onCampusSelected={selectCampus} onRefresh={()=>{}} onOpenExam={openExam} onSignOut={logout}/>;
 if(exam)return <div className="examio-workspace-shell"><ExaminationWorkspace uid={user.uid} campus={campus} exam={exam} categories={categories} classes={classes} subjects={subjects} students={students} rooms={examRooms} arrangements={arrangements} onSaveRoom={(room)=>dbApi.saveExamRoom(exam.id,room)} onDeleteRoom={(id)=>dbApi.deleteExamRoom(exam.id,id)} onDeleteBulkRooms={(ids)=>dbApi.deleteBulkExamRooms(exam.id,ids)} onSaveArrangement={dbApi.saveSeatingArrangement} onOpenPrintModal={(type,session,arrangement)=>setPrintRequest({type,session,arrangement})} onBack={()=>{setExam(null);setExamRooms([])}}/>{printRequest&&<PrintModalView type={printRequest.type} session={printRequest.session} arrangement={printRequest.arrangement} categories={categories} classes={classes} onClose={()=>setPrintRequest(null)}/>}</div>;
 return <div className="examio-app"><AppSidebarV2 activeTab={tab} onTabChange={setTab} campus={campus} campuses={campuses} onCampusChange={selectCampus} onMyCampuses={()=>selectCampus(null)} onLogout={logout}/><main className="examio-main">
  {tab==='dashboard'&&<DashboardView categories={categories} classes={classes} students={students} sessions={sessions} subjects={subjects} absenteeRecords={absentees} onNavigate={()=>setTab('examinations')} onSelectSessionForGenerator={()=>setTab('examinations')}/>}
  {tab==='categories'&&<CategoriesView categories={categories} classes={classes} rooms={[]} onSaveCategory={dbApi.saveCategory} onDeleteCategory={dbApi.deleteCategory} onDeleteBulkCategories={dbApi.deleteBulkCategories}/>}
  {tab==='classes'&&<ClassesView categories={categories} classes={classes} students={students} onSaveClassItem={dbApi.saveClassItem} onSaveBulkClasses={dbApi.saveBulkClasses} onDeleteClassItem={dbApi.deleteClassItem} onDeleteBulkClasses={dbApi.deleteBulkClasses}/>}
  {tab==='students'&&<StudentsView students={students} classes={classes} onSaveStudent={dbApi.saveStudent} onSaveBulkStudents={dbApi.saveBulkStudents} onDeleteStudent={dbApi.deleteStudent} onDeleteBulkStudents={dbApi.deleteBulkStudents}/>}
  {tab==='subjects'&&<SubjectsView subjects={subjects} onSave={attendanceApi.saveSubject} onDelete={attendanceApi.deleteSubject}/>}
  {tab==='examinations'&&<ExaminationsView uid={user.uid} campus={campus} exams={exams} onOpen={openExam}/>}
  {tab==='settings'&&<SettingsView adminCredentials={{username:user.email||'admin',password:''}} onSeedDemoData={async()=>{}} onClearAllData={dbApi.clearAllData} onNavigate={()=>{}} onDataRestored={()=>{}}/>}
 </main></div>;
}
