import { get, onValue, push, ref, remove, set } from 'firebase/database';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getFirestore, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from './realtime';
import { Campus, Examination, ExamTimetableEntry, ExamAbsenteeRecord } from '../types/tenant';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// The project already has a named Firestore database called "examio".
// Timetable uses the existing sessions collection because its deployed rules allow authenticated app data there.
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'examio');

const now = () => new Date().toISOString();
const campusesPath = (uid: string) => `users/${uid}/campuses`;
const campusPath = (uid: string, campusId: string) => `${campusesPath(uid)}/${campusId}`;
const examsPath = (uid: string, campusId: string) => `${campusPath(uid, campusId)}/examinations`;
const timetablePath = (uid: string, campusId: string, examId: string) => `${examsPath(uid, campusId)}/${examId}/timetable`;
const absenteesPath = (uid: string, campusId: string, examId: string) => `${examsPath(uid, campusId)}/${examId}/absentees`;
const localTimetableKey = (uid: string, campusId: string, examId: string) => `examio_timetable_${uid}_${campusId}_${examId}`;
const firestoreTimetableId = (uid: string, campusId: string, examId: string, entryId: string) => `examio_timetable_${uid}_${campusId}_${examId}_${entryId}`;

const readLocalTimetable = (uid: string, campusId: string, examId: string): ExamTimetableEntry[] => {
  try {
    const value = JSON.parse(localStorage.getItem(localTimetableKey(uid, campusId, examId)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};
const writeLocalTimetable = (uid: string, campusId: string, examId: string, entries: ExamTimetableEntry[]) => {
  try { localStorage.setItem(localTimetableKey(uid, campusId, examId), JSON.stringify(entries)); } catch {}
};

export const subscribeCampuses = (uid: string, callback: (items: Campus[]) => void) =>
  onValue(ref(db, campusesPath(uid)), snap => callback(Object.values(snap.val() || {}) as Campus[]), () => callback([]));
export const createCampus = async (uid: string, input: Omit<Campus, 'id'|'ownerId'|'createdAt'|'updatedAt'>) => {
  const newRef = push(ref(db, campusesPath(uid)));
  const campus: Campus = { id: newRef.key!, ownerId: uid, ...input, createdAt: now(), updatedAt: now() };
  await set(newRef, campus); return campus;
};
export const updateCampus = async (uid: string, campus: Campus) => set(ref(db, campusPath(uid, campus.id)), { ...campus, updatedAt: now() });
export const deleteCampus = async (uid: string, campusId: string) => remove(ref(db, campusPath(uid, campusId)));

export const subscribeExaminations = (uid: string, campusId: string, callback: (items: Examination[]) => void) =>
  onValue(ref(db, examsPath(uid, campusId)), snap => {
    const value = snap.val() || {};
    callback(Object.values(value).sort((a: any,b: any) => String(b.startDate).localeCompare(String(a.startDate))) as Examination[]);
  }, () => callback([]));
export const createExamination = async (uid: string, campusId: string, input: Omit<Examination, 'id'|'campusId'|'createdAt'|'updatedAt'>) => {
  const newRef = push(ref(db, examsPath(uid, campusId)));
  const exam: Examination = { id: newRef.key!, campusId, ...input, createdAt: now(), updatedAt: now() };
  await set(newRef, exam); return exam;
};
export const updateExamination = async (uid: string, campusId: string, exam: Examination) => set(ref(db, `${examsPath(uid, campusId)}/${exam.id}`), { ...exam, updatedAt: now() });
export const deleteExamination = async (uid: string, campusId: string, examId: string) => remove(ref(db, `${examsPath(uid, campusId)}/${examId}`));
export const getExamination = async (uid: string, campusId: string, examId: string) => {
  const snap = await get(ref(db, `${examsPath(uid, campusId)}/${examId}`));
  return snap.exists() ? snap.val() as Examination : null;
};

const sortTimetable = (items: ExamTimetableEntry[]) => [...items].sort((a,b) => `${a.date}|${a.startTime || ''}|${a.classId}`.localeCompare(`${b.date}|${b.startTime || ''}|${b.classId}`));

/**
 * Timetable persistence now has a dedicated Cloud Firestore copy as the primary
 * cloud source of truth, in addition to the existing Realtime Database path.
 * The Firestore `sessions` collection is already permitted by the project's
 * deployed rules, avoiding the Realtime Database rule/path issue that was
 * causing timetable entries to disappear.
 */
export const subscribeTimetable = (uid: string, campusId: string, examId: string, callback: (items: ExamTimetableEntry[]) => void) => {
  if (!uid || !campusId || !examId) { callback([]); return () => {}; }

  const local = readLocalTimetable(uid, campusId, examId);
  if (local.length) callback(local);

  const firestoreQuery = query(
    collection(firestore, 'sessions'),
    where('type', '==', 'examio-timetable'),
    where('uid', '==', uid),
    where('campusId', '==', campusId),
    where('examId', '==', examId)
  );

  let realtimeUnsubscribe: (() => void) | undefined;
  let firestoreReceived = false;

  const unsubscribeFirestore = onSnapshot(firestoreQuery, snap => {
    firestoreReceived = true;
    const items = snap.docs.map(d => d.data().entry as ExamTimetableEntry).filter(Boolean);
    const sorted = sortTimetable(items);
    if (sorted.length) writeLocalTimetable(uid, campusId, examId, sorted);
    callback(sorted.length ? sorted : readLocalTimetable(uid, campusId, examId));
  }, error => {
    console.error('Timetable Firestore load failed:', error);
    if (!firestoreReceived) callback(readLocalTimetable(uid, campusId, examId));
  });

  // Keep reading the legacy Realtime Database copy for existing records and migration.
  realtimeUnsubscribe = onValue(ref(db, timetablePath(uid, campusId, examId)), snap => {
    const value = snap.val();
    if (value && typeof value === 'object') {
      const items = sortTimetable(Object.values(value) as ExamTimetableEntry[]);
      if (items.length && !firestoreReceived) callback(items);
      writeLocalTimetable(uid, campusId, examId, items);
    }
  }, error => console.error('Legacy timetable load failed:', error));

  return () => { unsubscribeFirestore(); realtimeUnsubscribe?.(); };
};

export const saveTimetableEntry = async (uid: string, campusId: string, entry: ExamTimetableEntry) => {
  if (!uid || !campusId || !entry.examinationId || !entry.id) throw new Error('Missing user, campus, examination, or timetable entry ID.');

  const current = readLocalTimetable(uid, campusId, entry.examinationId).filter(x => x.id !== entry.id);
  const next = sortTimetable([...current, entry]);
  writeLocalTimetable(uid, campusId, entry.examinationId, next);

  // Primary cloud persistence: Firestore.
  const firestoreId = firestoreTimetableId(uid, campusId, entry.examinationId, entry.id);
  await setDoc(doc(firestore, 'sessions', firestoreId), {
    type: 'examio-timetable',
    uid,
    campusId,
    examId: entry.examinationId,
    entry,
    updatedAt: now()
  }, { merge: true });

  // Keep the existing Realtime Database representation too for compatibility.
  try {
    await set(ref(db, `${timetablePath(uid, campusId, entry.examinationId)}/${entry.id}`), entry);
  } catch (error) {
    console.warn('Realtime timetable mirror failed; Firestore copy is authoritative:', error);
  }
};

export const deleteTimetableEntry = async (uid: string, campusId: string, examId: string, entryId: string) => {
  if (!uid || !campusId || !examId || !entryId) throw new Error('Missing timetable identifiers.');
  const next = readLocalTimetable(uid, campusId, examId).filter(x => x.id !== entryId);
  writeLocalTimetable(uid, campusId, examId, next);

  await deleteDoc(doc(firestore, 'sessions', firestoreTimetableId(uid, campusId, examId, entryId)));
  try { await remove(ref(db, `${timetablePath(uid, campusId, examId)}/${entryId}`)); }
  catch (error) { console.warn('Realtime timetable mirror delete failed:', error); }
};

export const subscribeAbsentees = (uid: string, campusId: string, examId: string, callback: (items: ExamAbsenteeRecord[]) => void) =>
  onValue(ref(db, absenteesPath(uid, campusId, examId)), snap => callback(Object.values(snap.val() || {}) as ExamAbsenteeRecord[]), error => { console.error('Absentee load failed:', error); callback([]); });
export const saveAbsentee = async (uid: string, campusId: string, record: ExamAbsenteeRecord) => set(ref(db, `${absenteesPath(uid, campusId, record.examinationId)}/${record.id}`), record);
export const deleteAbsentee = async (uid: string, campusId: string, examId: string, id: string) => remove(ref(db, `${absenteesPath(uid, campusId, examId)}/${id}`));

export const setSelectedCampus = (campusId: string) => localStorage.setItem('examio_campus_id', campusId);
export const getSelectedCampus = () => localStorage.getItem('examio_campus_id') || '';
export const clearSelectedCampus = () => localStorage.removeItem('examio_campus_id');