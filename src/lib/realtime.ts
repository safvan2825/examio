import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, set, remove, update, get } from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';
import { Category, ClassItem, Student, Room, ExamSession, SeatingArrangement, AdminCredentials } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app, 'https://examio-d4724-default-rtdb.asia-southeast1.firebasedatabase.app');
export { db };
export const DEFAULT_CREDENTIALS: AdminCredentials = { username: 'nhexam', password: 'exam2026' };
const campusId = () => localStorage.getItem('examio_campus_id') || '';
const userId = () => auth.currentUser?.uid || '';
export const campusDataPath = (path:string) => { const uid=userId(), cid=campusId(); if(!uid||!cid) throw new Error('No authenticated user or selected campus.'); return `users/${uid}/campuses/${cid}/${path}`; };
const cache=(k:string,d:unknown)=>{try{localStorage.setItem(k,JSON.stringify(d))}catch{}};
const cached=<T,>(k:string):T[]=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}};
const clean=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const keys={c:'nh_categories',cl:'nh_classes',s:'nh_students',se:'nh_sessions',a:'nh_seating_arrangements',cr:'nh_credentials'};
const sub=<T,>(path:string,key:string,cb:(x:T[])=>void,sort?:(a:T,b:T)=>number)=>onValue(ref(db,campusDataPath(path)),s=>{const v=s.val()||{};const x=Object.values(v) as T[];if(sort)x.sort(sort);cache(key,x);cb(x)},()=>cb(cached<T>(key)));
export const subscribeCategories=(cb:(x:Category[])=>void)=>sub('categories',keys.c,cb,(a,b)=>a.name.localeCompare(b.name));
export const subscribeClasses=(cb:(x:ClassItem[])=>void)=>sub('classes',keys.cl,cb,(a,b)=>a.name.localeCompare(b.name));
export const subscribeStudents=(cb:(x:Student[])=>void)=>sub('students',keys.s,cb,(a,b)=>a.admissionNo.localeCompare(b.admissionNo));
export const subscribeSessions=(cb:(x:ExamSession[])=>void)=>sub('sessions',keys.se,cb,(a,b)=>b.date.localeCompare(a.date));
export const subscribeSeatingArrangements=(cb:(x:SeatingArrangement[])=>void)=>sub('seatingArrangements',keys.a,cb);

// Rooms belong to an examination, not to the permanent campus register.
// Each examination therefore has its own room list and layout configuration.
const examRoomsPath=(examId:string)=>campusDataPath(`examinations/${examId}/rooms`);
export const subscribeExamRooms=(examId:string,cb:(x:Room[])=>void)=>onValue(ref(db,examRoomsPath(examId)),s=>{const v=s.val()||{};const x=Object.values(v) as Room[];x.sort((a,b)=>a.name.localeCompare(b.name));cb(x)},()=>cb([]));
export const saveExamRoom=(examId:string,x:Room)=>set(ref(db,`${examRoomsPath(examId)}/${x.id}`),clean(x));
export const deleteExamRoom=(examId:string,id:string)=>remove(ref(db,`${examRoomsPath(examId)}/${id}`));
export const deleteBulkExamRooms=async(examId:string,ids:string[])=>{const u:Record<string,null>={};ids.forEach(id=>u[`${examRoomsPath(examId)}/${id}`]=null);if(Object.keys(u).length)await update(ref(db),u)};

const save=async<T extends{id:string}>(p:string,x:T,k:string)=>{await set(ref(db,campusDataPath(`${p}/${x.id}`)),clean(x));const a=cached<T>(k);const i=a.findIndex(v=>v.id===x.id);i>=0?a[i]=x:a.push(x);cache(k,a)};
const del=async<T extends{id:string}>(p:string,id:string,k:string)=>{await remove(ref(db,campusDataPath(`${p}/${id}`)));cache(k,cached<T>(k).filter(x=>x.id!==id))};
const bulk=async<T extends{id:string}>(p:string,xs:T[],k:string)=>{const u:Record<string,unknown>={};xs.forEach(x=>u[campusDataPath(`${p}/${x.id}`)]=clean(x));if(Object.keys(u).length)await update(ref(db),u);cache(k,xs)};
const bulkDel=async(p:string,ids:string[],k:string)=>{const u:Record<string,null>={};ids.forEach(id=>u[campusDataPath(`${p}/${id}`)]=null);if(Object.keys(u).length)await update(ref(db),u);const q=new Set(ids);cache(k,cached<any>(k).filter(x=>!q.has(x.id)))};
export const saveCategory=(x:Category)=>save('categories',x,keys.c);export const deleteCategory=(id:string)=>del<Category>('categories',id,keys.c);export const deleteBulkCategories=(ids:string[])=>bulkDel('categories',ids,keys.c);
export const saveClassItem=(x:ClassItem)=>save('classes',x,keys.cl);export const saveBulkClasses=(x:ClassItem[])=>bulk('classes',x,keys.cl);export const deleteClassItem=(id:string)=>del<ClassItem>('classes',id,keys.cl);export const deleteBulkClasses=(ids:string[])=>bulkDel('classes',ids,keys.cl);
export const saveStudent=(x:Student)=>save('students',x,keys.s);export const saveBulkStudents=(x:Student[])=>bulk('students',x,keys.s);export const deleteStudent=(id:string)=>del<Student>('students',id,keys.s);export const deleteBulkStudents=(ids:string[])=>bulkDel('students',ids,keys.s);
export const saveSession=(x:ExamSession)=>save('sessions',x,keys.se);export const deleteSession=(id:string)=>del<ExamSession>('sessions',id,keys.se);export const saveSeatingArrangement=(x:SeatingArrangement)=>save('seatingArrangements',x,keys.a);
export const subscribeAdminCredentials=(cb:(x:AdminCredentials)=>void)=>onValue(ref(db,campusDataPath('settings/credentials')),s=>{const x=s.val();cb(x?.username&&x?.password?x:DEFAULT_CREDENTIALS)},()=>cb(DEFAULT_CREDENTIALS));
export const saveAdminCredentials=async(x:AdminCredentials)=>set(ref(db,campusDataPath('settings/credentials')),clean({...x,updatedAt:new Date().toISOString()}));
export const exportAllDataJSON=async()=>{const paths=['categories','classes','students','sessions','seatingArrangements'];const b:any={boardName:'Noorul Huda Examination Board',version:'4.0',exportDate:new Date().toISOString()};for(const p of paths){const s=await get(ref(db,campusDataPath(p)));b[p]=Object.values(s.val()||{})}return JSON.stringify(b,null,2)};
export const importAllDataJSON=async(j:string)=>{const d=JSON.parse(j);if(!d.categories||!d.classes||!d.students)throw Error('Invalid backup file structure.');const u:Record<string,unknown>={};for(const p of ['categories','classes','students','sessions','seatingArrangements'])for(const x of d[p]||[])u[campusDataPath(`${p}/${x.id}`)]=clean(x);if(Object.keys(u).length)await update(ref(db),u);return true;};
export const clearAllData=async()=>{const u:Record<string,null>={};['categories','classes','students','sessions','seatingArrangements'].forEach(p=>u[campusDataPath(p)]=null);await update(ref(db),u);Object.values(keys).forEach(k=>{try{localStorage.removeItem(k)}catch{}})};
export const seedSampleData=async()=>{};

// One-time recovery of the legacy Examio database into the selected campus.
// Permanent campus data is migrated; legacy rooms are intentionally not migrated
// because rooms are now examination-specific.
export const migrateLegacyDataToCampus=async(id:string)=>{
  const uid=userId();
  if(!uid) throw new Error('Not signed in.');
  const paths=['categories','classes','students','sessions','seatingArrangements'];
  const writes:Record<string,unknown>={};
  for(const p of paths){
    const oldSnap=await get(ref(db,p));
    if(!oldSnap.exists()) continue;
    const targetSnap=await get(ref(db,`users/${uid}/campuses/${id}/${p}`));
    const oldValue=oldSnap.val()||{};
    const targetValue=targetSnap.val()||{};
    for(const [key,value] of Object.entries(oldValue)){
      if(targetValue[key]===undefined) writes[`users/${uid}/campuses/${id}/${p}/${key}`]=clean(value);
    }
  }
  if(Object.keys(writes).length) await update(ref(db),writes);
};
