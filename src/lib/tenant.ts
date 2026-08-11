import { get, onValue, push, ref, remove, set, update } from 'firebase/database';
import { db } from './realtime';
import { Campus, Examination, ExamTimetableEntry } from '../types/tenant';

const now = () => new Date().toISOString();
const campusesPath = (uid: string) => `users/${uid}/campuses`;
const campusPath = (uid: string, campusId: string) => `${campusesPath(uid)}/${campusId}`;
const examsPath = (uid: string, campusId: string) => `${campusPath(uid, campusId)}/examinations`;

export const subscribeCampuses = (uid: string, callback: (items: Campus[]) => void) =>
  onValue(ref(db, campusesPath(uid)), snap => {
    const value = snap.val() || {};
    callback(Object.values(value) as Campus[]);
  }, error => {
    console.error('Campus load failed:', error);
    callback([]);
  });

export const createCampus = async (uid: string, input: Omit<Campus, 'id'|'ownerId'|'createdAt'|'updatedAt'>) => {
  const newRef = push(ref(db, campusesPath(uid)));
  const campus: Campus = { id: newRef.key!, ownerId: uid, ...input, createdAt: now(), updatedAt: now() };
  await set(newRef, campus);
  return campus;
};

export const updateCampus = async (uid: string, campus: Campus) => {
  await set(ref(db, campusPath(uid, campus.id)), { ...campus, updatedAt: now() });
};

export const deleteCampus = async (uid: string, campusId: string) => {
  await remove(ref(db, campusPath(uid, campusId)));
};

export const subscribeExaminations = (uid: string, campusId: string, callback: (items: Examination[]) => void) =>
  onValue(ref(db, examsPath(uid, campusId)), snap => {
    const value = snap.val() || {};
    callback(Object.values(value).sort((a: any,b: any) => String(b.startDate).localeCompare(String(a.startDate))) as Examination[]);
  }, error => {
    console.error('Examination load failed:', error);
    callback([]);
  });

export const createExamination = async (uid: string, campusId: string, input: Omit<Examination, 'id'|'campusId'|'createdAt'|'updatedAt'>) => {
  const newRef = push(ref(db, examsPath(uid, campusId)));
  const exam: Examination = { id: newRef.key!, campusId, ...input, createdAt: now(), updatedAt: now() };
  await set(newRef, exam);
  return exam;
};

export const updateExamination = async (uid: string, campusId: string, exam: Examination) => {
  await set(ref(db, `${examsPath(uid, campusId)}/${exam.id}`), { ...exam, updatedAt: now() });
};

export const deleteExamination = async (uid: string, campusId: string, examId: string) => {
  await remove(ref(db, `${examsPath(uid, campusId)}/${examId}`));
};

export const getExamination = async (uid: string, campusId: string, examId: string) => {
  const snap = await get(ref(db, `${examsPath(uid, campusId)}/${examId}`));
  return snap.exists() ? snap.val() as Examination : null;
};

export const subscribeTimetable = (uid: string, campusId: string, examId: string, callback: (items: ExamTimetableEntry[]) => void) =>
  onValue(ref(db, `${examsPath(uid, campusId)}/${examId}/timetable`), snap => {
    const value = snap.val() || {};
    callback(Object.values(value) as ExamTimetableEntry[]);
  }, error => { console.error('Timetable load failed:', error); callback([]); });

export const saveTimetableEntry = async (uid: string, campusId: string, entry: ExamTimetableEntry) => {
  await set(ref(db, `${examsPath(uid, campusId)}/${entry.examinationId}/timetable/${entry.id}`), entry);
};

export const deleteTimetableEntry = async (uid: string, campusId: string, examId: string, entryId: string) => {
  await remove(ref(db, `${examsPath(uid, campusId)}/${examId}/timetable/${entryId}`));
};

export const setSelectedCampus = (campusId: string) => localStorage.setItem('examio_campus_id', campusId);
export const getSelectedCampus = () => localStorage.getItem('examio_campus_id') || '';
export const clearSelectedCampus = () => localStorage.removeItem('examio_campus_id');
