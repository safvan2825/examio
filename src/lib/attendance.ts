import { onValue, ref, remove, set, update } from 'firebase/database';
import { db } from './realtime';
import { AbsenteeRecord, Subject } from '../types';

export const subscribeSubjects = (callback: (data: Subject[]) => void) =>
  onValue(ref(db, 'subjects'), (snapshot) => {
    const value = snapshot.val() || {};
    const items = Object.values(value) as Subject[];
    items.sort((a, b) => a.name.localeCompare(b.name));
    callback(items);
  }, (error) => {
    console.error('Subjects read error:', error);
    callback([]);
  });

export const saveSubject = async (subject: Subject) => set(ref(db, `subjects/${subject.id}`), subject);
export const deleteSubject = async (id: string) => remove(ref(db, `subjects/${id}`));

export const subscribeAbsenteeRecords = (callback: (data: AbsenteeRecord[]) => void) =>
  onValue(ref(db, 'absenteeRecords'), (snapshot) => {
    const value = snapshot.val() || {};
    const items = Object.values(value) as AbsenteeRecord[];
    items.sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
    callback(items);
  }, (error) => {
    console.error('Absentee records read error:', error);
    callback([]);
  });

export const saveAbsenteeRecords = async (records: AbsenteeRecord[]) => {
  if (!records.length) return;
  const updates: Record<string, unknown> = {};
  records.forEach((record) => { updates[`absenteeRecords/${record.id}`] = record; });
  await update(ref(db), updates);
};

export const saveAbsenteeRecord = async (record: AbsenteeRecord) =>
  set(ref(db, `absenteeRecords/${record.id}`), record);

export const deleteAbsenteeRecord = async (id: string) => remove(ref(db, `absenteeRecords/${id}`));
