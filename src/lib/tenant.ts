import { get, onValue, push, ref, remove, set } from 'firebase/database';
import { db } from './realtime';
import { Campus, Examination, ExamTimetableEntry, ExamAbsenteeRecord } from '../types/tenant';

const now = () => new Date().toISOString();
const campusesPath = (uid: string) => `users/${uid}/campuses`;
const campusPath = (uid: string, campusId: string) => `${campusesPath(uid)}/${campusId}`;
const examsPath = (uid: string, campusId: string) => `${campusPath(uid, campusId)}/examinations`;
const timetablePath = (uid: string, campusId: string, examId: string) => `${examsPath(uid, campusId)}/${examId}/timetable`;
const absenteesPath = (uid: string, campusId: string, examId: string) => `${examsPath(uid, campusId)}/${examId}/absentees`;

export const subscribeCampuses = (uid: string, callback: (items: Campus[]) => void) => onValue(ref(db, campusesPath(uid)), snap => { const value = snap.val() || {}; callback(Object.values(value) as Campus[]); }, error => { console.error('Campus load failed:', error); callback([]); });
export const createCampus = async (uid: string, input: Omit<Campus, 'id'|'ownerId'|'createdAt'|'updatedAt'>) => { const newRef = push(ref(db, campusesPath(uid))); const campus: Campus = { id: newRef.key!, ownerId: uid, ...input, createdAt: now(), updatedAt: now() }; await set(newRef, campus); return campus; };
export const updateCampus = async (uid: string, campus: Campus) => { await set(ref(db, campusPath(uid, campus.id)), { ...campus, updatedAt: now() }); };
export const deleteCampus = async (uid: string, campusId: string) => { await remove(ref(db, campusPath(uid, campusId))); };

export const subscribeExaminations = (uid: string, campusId: string, callback: (items: Examination[]) => void) => onValue(ref(db, examsPath(uid, campusId)), snap => { const value = snap.val() || {}; callback(Object.values(value).sort((a: any,b: any) => String(b.startDate).localeCompare(String(a.startDate))) as Examination[]); }, error => { console.error('Examination load failed:', error); callback([]); });
export const createExamination = async (uid: string, campusId: string, input: Omit<Examination, 'id'|'campusId'|'createdAt'|'updatedAt'>) => { const newRef = push(ref(db, examsPath(uid, campusId))); const exam: Examination = { id: newRef.key!, campusId, ...input, createdAt: now(), updatedAt: now() }; await set(newRef, exam); return exam; };
export const updateExamination = async (uid: string, campusId: string, exam: Examination) => { await set(ref(db, `${examsPath(uid, campusId)}/${exam.id}`), { ...exam, updatedAt: now() }); };
export const deleteExamination = async (uid: string, campusId: string, examId: string) => { await remove(ref(db, `${examsPath(uid, campusId)}/${examId}`)); };
export const getExamination = async (uid: string, campusId: string, examId: string) => { const snap = await get(ref(db, `${examsPath(uid, campusId)}/${examId}`)); return snap.exists() ? snap.val() as Examination : null; };

/** Examination timetable is persisted in the exam-specific Firebase Realtime Database path. */
export const subscribeTimetable = (uid: string, campusId: string, examId: string, callback: (items: ExamTimetableEntry[]) => void) => {
  if (!uid || !campusId || !examId) { callback([]); return () => {}; }
  return onValue(ref(db, timetablePath(uid, campusId, examId)), snap => {
    const value = snap.val();
    if (!value || typeof value !== 'object') { callback([]); return; }
    const items = Object.values(value) as ExamTimetableEntry[];
    callback(items.sort((a, b) => `${a.date}|${a.startTime || ''}|${a.classId}`.localeCompare(`${b.date}|${b.startTime || ''}|${b.classId}`)));
  }, error => { console.error('Timetable load failed:', error); callback([]); });
};

export const saveTimetableEntry = async (uid: string, campusId: string, entry: ExamTimetableEntry) => {
  if (!uid || !campusId || !entry.examinationId || !entry.id) throw new Error('Missing user, campus, examination, or timetable entry ID.');
  const entryRef = ref(db, `${timetablePath(uid, campusId, entry.examinationId)}/${entry.id}`);
  await set(entryRef, entry);
  const saved = await get(entryRef);
  if (!saved.exists()) throw new Error('Timetable entry was not persisted to Firebase. Check Realtime Database rules and connection.');
};

export const deleteTimetableEntry = async (uid: string, campusId: string, examId: string, entryId: string) => {
  if (!uid || !campusId || !examId || !entryId) throw new Error('Missing timetable identifiers.');
  await remove(ref(db, `${timetablePath(uid, campusId, examId)}/${entryId}`));
};

export const subscribeAbsentees = (uid:string,campusId:string,examId:string,callback:(items:ExamAbsenteeRecord[])=>void) => onValue(ref(db,absenteesPath(uid,campusId,examId)), snap => { const value=snap.val()||{}; callback(Object.values(value) as ExamAbsenteeRecord[]); }, error => { console.error('Absentee load failed:',error); callback([]); });
export const saveAbsentee = async (uid:string,campusId:string,record:ExamAbsenteeRecord) => { await set(ref(db,`${absenteesPath(uid,campusId,record.examinationId)}/${record.id}`),record); };
export const deleteAbsentee = async (uid:string,campusId:string,examId:string,id:string) => { await remove(ref(db,`${absenteesPath(uid,campusId,examId)}/${id}`)); };

export const setSelectedCampus = (campusId: string) => localStorage.setItem('examio_campus_id', campusId);
export const getSelectedCampus = () => localStorage.getItem('examio_campus_id') || '';
export const clearSelectedCampus = () => localStorage.removeItem('examio_campus_id');
