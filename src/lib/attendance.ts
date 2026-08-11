import { onValue, ref, remove, set, update } from 'firebase/database';
import { db, campusDataPath } from './realtime';
import { AbsenteeRecord, Subject } from '../types';

export const subscribeSubjects=(cb:(x:Subject[])=>void)=>onValue(ref(db,campusDataPath('subjects')),s=>{const x=Object.values(s.val()||{}) as Subject[];x.sort((a,b)=>a.name.localeCompare(b.name));cb(x)},()=>cb([]));
export const saveSubject=(x:Subject)=>set(ref(db,campusDataPath(`subjects/${x.id}`)),x);
export const deleteSubject=(id:string)=>remove(ref(db,campusDataPath(`subjects/${id}`)));
export const subscribeAbsenteeRecords=(cb:(x:AbsenteeRecord[])=>void)=>onValue(ref(db,campusDataPath('absenteeRecords')),s=>{const x=Object.values(s.val()||{}) as AbsenteeRecord[];x.sort((a,b)=>`${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));cb(x)},()=>cb([]));
export const saveAbsenteeRecords=async(xs:AbsenteeRecord[])=>{const u:Record<string,unknown>={};xs.forEach(x=>u[campusDataPath(`absenteeRecords/${x.id}`)]=x);if(Object.keys(u).length)await update(ref(db),u)};
export const saveAbsenteeRecord=(x:AbsenteeRecord)=>set(ref(db,campusDataPath(`absenteeRecords/${x.id}`)),x);
export const deleteAbsenteeRecord=(id:string)=>remove(ref(db,campusDataPath(`absenteeRecords/${id}`)));
