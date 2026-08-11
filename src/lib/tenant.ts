import { get, onValue, push, ref, remove, set } from 'firebase/database';
import { db } from './realtime';
import { Campus, Examination, ExamTimetableEntry, ExamAbsenteeRecord } from '../types/tenant';

const now = () => new Date().toISOString();
const campusesPath = (uid: string) => `users/${uid}/campuses`;
const campusPath = (uid: string, campusId: string) => `${campusesPath(uid)}/${campusId}`;
const examsPath = (uid: string, campusId: string) => `${campusPath(uid, campusId)}/examinations`;
const timetablePath = (uid:string,campusId:string,examId:string) => `${examsPath(uid,campusId)}/${examId}/timetable`;
const absenteesPath = (uid:string,campusId:string,examId:string) => `${examsPath(uid,campusId)}/${examId}/absentees`;
const timetableCacheKey = (uid:string,campusId:string,examId:string) => `examio_timetable_${uid}_${campusId}_${examId}`;
const readTimetableCache = (uid:string,campusId:string,examId:string): ExamTimetableEntry[] => {
  try { return JSON.parse(localStorage.getItem(timetableCacheKey(uid,campusId,examId)) || '[]'); } catch { return []; }
};
const writeTimetableCache = (uid:string,campusId:string,examId:string,items:ExamTimetableEntry[]) => {
  try { localStorage.setItem(timetableCacheKey(uid,campusId,examId), JSON.stringify(items)); } catch {}
};

export const subscribeCampuses = (uid: string, callback: (items: Campus[]) => void) =>
  onValue(ref(db, campusesPath(uid)), snap => { const value = snap.val() || {}; callback(Object.values(value) as Campus[]); }, error => { console.error('Campus load failed:', error); callback([]); });

export const createCampus = async (uid: string, input: Omit<Campus, 'id'|'ownerId'|'createdAt'|'updatedAt'>) => { const newRef = push(ref(db, campusesPath(uid))); const campus: Campus = { id: newRef.key!, ownerId: uid, ...input, createdAt: now(), updatedAt: now() }; await set(newRef, campus); return campus; };
export const updateCampus = async (uid: string, campus: Campus) => { await set(ref(db, campusPath(uid, campus.id)), { ...campus, updatedAt: now() }); };
export const deleteCampus = async (uid: string, campusId: string) => { await remove(ref(db, campusPath(uid, campusId))); };

export const subscribeExaminations = (uid: string, campusId: string, callback: (items: Examination[]) => void) =>
  onValue(ref(db, examsPath(uid, campusId)), snap => { const value = snap.val() || {}; callback(Object.values(value).sort((a: any,b: any) => String(b.startDate).localeCompare(String(a.startDate))) as Examination[]); }, error => { console.error('Examination load failed:', error); callback([]); });
export const createExamination = async (uid: string, campusId: string, input: Omit<Examination, 'id'|'campusId'|'createdAt'|'updatedAt'>) => { const newRef = push(ref(db, examsPath(uid, campusId))); const exam: Examination = { id: newRef.key!, campusId, ...input, createdAt: now(), updatedAt: now() }; await set(newRef, exam); return exam; };
export const updateExamination = async (uid: string, campusId: string, exam: Examination) => { await set(ref(db, `${examsPath(uid, campusId)}/${exam.id}`), { ...exam, updatedAt: now() }); };
export const deleteExamination = async (uid: string, campusId: string, examId: string) => { await remove(ref(db, `${examsPath(uid, campusId)}/${examId}`)); try { localStorage.removeItem(timetableCacheKey(uid,campusId,examId)); } catch {} };
export const getExamination = async (uid: string, campusId: string, examId: string) => { const snap = await get(ref(db, `${examsPath(uid, campusId)}/${examId}`)); return snap.exists() ? snap.val() as Examination : null; };

export const subscribeTimetable = (uid: string, campusId: string, examId: string, callback: (items: ExamTimetableEntry[]) => void) =>
  onValue(
    ref(db, timetablePath(uid,campusId,examId)),
    snap => {
      const value = snap.val() || {};
      const remote = Object.values(value) as ExamTimetableEntry[];
      // If Firebase is temporarily empty while the connection is recovering, retain the
      // last confirmed browser copy instead of making the timetable appear to disappear.
      callback(remote.length ? remote : readTimetableCache(uid,campusId,examId));
    },
    error => {
      console.error('Timetable load failed:', error);
      callback(readTimetableCache(uid,campusId,examId));
    }
  );

export const saveTimetableEntry = async (uid: string, campusId: string, entry: ExamTimetableEntry) => {
  const entryRef = ref(db, `${timetablePath(uid,campusId,entry.examinationId)}/${entry.id}`);
  await set(entryRef, entry);
  // Read-after-write verification prevents a false "saved" state when Firebase rejects
  // or fails to persist the write.
  const saved = await get(entryRef);
  if (!saved.exists()) throw new Error('Timetable entry was not persisted to Firebase. Please check your Firebase Realtime Database rules.');
  const current = readTimetableCache(uid,campusId,entry.examinationId).filter(x=>x.id!==entry.id);
  writeTimetableCache(uid,campusId,entry.examinationId,[...current,entry]);
};

export const deleteTimetableEntry = async (uid: string, campusId: string, examId: string, entryId: string) => {
  await remove(ref(db, `${timetablePath(uid,campusId,examId)}/${entryId}`));
  const remaining = readTimetableCache(uid,campusId,examId).filter(x=>x.id!==entryId);
  writeTimetableCache(uid,campusId,examId,remaining);
};

export const subscribeAbsentees = (uid:string,campusId:string,examId:string,callback:(items:ExamAbsenteeRecord[])=>void) => onValue(ref(db,absenteesPath(uid,campusId,examId)), snap => { const value=snap.val()||{}; callback(Object.values(value) as ExamAbsenteeRecord[]); }, error => { console.error('Absentee load failed:',error); callback([]); });
export const saveAbsentee = async (uid:string,campusId:string,record:ExamAbsenteeRecord) => { await set(ref(db,`${absenteesPath(uid,campusId,record.examinationId)}/${record.id}`),record); };
export const deleteAbsentee = async (uid:string,campusId:string,examId:string,id:string) => { await remove(ref(db,`${absenteesPath(uid,campusId,examId)}/${id}`)); };

export const setSelectedCampus = (campusId: string) => localStorage.setItem('examio_campus_id', campusId);
export const getSelectedCampus = () => localStorage.getItem('examio_campus_id') || '';
export const clearSelectedCampus = () => localStorage.removeItem('examio_campus_id');
