import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
  update,
  get,
} from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Category,
  ClassItem,
  Student,
  Room,
  ExamSession,
  SeatingArrangement,
  AdminCredentials,
} from '../types';

// Examio now uses Firebase Realtime Database instead of Firestore.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const DATABASE_URL = 'https://examio-d4724-default-rtdb.asia-southeast1.firebasedatabase.app';
const db = getDatabase(app, DATABASE_URL);
export { db };

export const DEFAULT_CREDENTIALS: AdminCredentials = {
  username: 'nhexam',
  password: 'exam2026',
};

const STORAGE_KEYS = {
  CATEGORIES: 'nh_categories',
  CLASSES: 'nh_classes',
  STUDENTS: 'nh_students',
  ROOMS: 'nh_rooms',
  SESSIONS: 'nh_sessions',
  SEATING: 'nh_seating_arrangements',
  CREDENTIALS: 'nh_credentials',
};

const setLocalCache = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage cache error:', e);
  }
};

const getLocalCache = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const clean = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const subscribeCollection = <T>(
  path: string,
  cacheKey: string,
  callback: (data: T[]) => void,
  sortFn?: (a: T, b: T) => number
) => {
  const collectionRef = ref(db, path);
  return onValue(
    collectionRef,
    (snapshot) => {
      const value = snapshot.val() || {};
      const items = Object.values(value) as T[];
      if (sortFn) items.sort(sortFn);
      setLocalCache(cacheKey, items);
      callback(items);
    },
    (error) => {
      console.error(`Realtime Database ${path} read error:`, error);
      callback(getLocalCache<T>(cacheKey));
    }
  );
};

export const subscribeCategories = (callback: (data: Category[]) => void) =>
  subscribeCollection<Category>(
    'categories',
    STORAGE_KEYS.CATEGORIES,
    callback,
    (a, b) => a.name.localeCompare(b.name)
  );

export const subscribeClasses = (callback: (data: ClassItem[]) => void) =>
  subscribeCollection<ClassItem>(
    'classes',
    STORAGE_KEYS.CLASSES,
    callback,
    (a, b) => a.name.localeCompare(b.name)
  );

export const subscribeStudents = (callback: (data: Student[]) => void) =>
  subscribeCollection<Student>(
    'students',
    STORAGE_KEYS.STUDENTS,
    callback,
    (a, b) => a.admissionNo.localeCompare(b.admissionNo)
  );

export const subscribeRooms = (callback: (data: Room[]) => void) =>
  subscribeCollection<Room>(
    'rooms',
    STORAGE_KEYS.ROOMS,
    callback,
    (a, b) => a.name.localeCompare(b.name)
  );

export const subscribeSessions = (callback: (data: ExamSession[]) => void) =>
  subscribeCollection<ExamSession>(
    'sessions',
    STORAGE_KEYS.SESSIONS,
    callback,
    (a, b) => b.date.localeCompare(a.date)
  );

export const subscribeSeatingArrangements = (
  callback: (data: SeatingArrangement[]) => void
) => subscribeCollection<SeatingArrangement>('seatingArrangements', STORAGE_KEYS.SEATING, callback);

const saveItem = async <T extends { id: string }>(path: string, item: T, cacheKey: string) => {
  await set(ref(db, `${path}/${item.id}`), clean(item));
  const local = getLocalCache<T>(cacheKey);
  const idx = local.findIndex((x) => x.id === item.id);
  if (idx >= 0) local[idx] = item;
  else local.push(item);
  setLocalCache(cacheKey, local);
};

const deleteItem = async <T extends { id: string }>(path: string, id: string, cacheKey: string) => {
  await remove(ref(db, `${path}/${id}`));
  setLocalCache(cacheKey, getLocalCache<T>(cacheKey).filter((x) => x.id !== id));
};

const saveMany = async <T extends { id: string }>(path: string, items: T[], cacheKey: string) => {
  const updates: Record<string, unknown> = {};
  items.forEach((item) => {
    updates[`${path}/${item.id}`] = clean(item);
  });
  if (Object.keys(updates).length) await update(ref(db), updates);

  const map = new Map(getLocalCache<T>(cacheKey).map((x) => [x.id, x]));
  items.forEach((x) => map.set(x.id, x));
  setLocalCache(cacheKey, Array.from(map.values()));
};

const deleteMany = async <T>(path: string, ids: string[], cacheKey: string) => {
  const updates: Record<string, null> = {};
  ids.forEach((id) => {
    updates[`${path}/${id}`] = null;
  });
  if (Object.keys(updates).length) await update(ref(db), updates);
  const idsSet = new Set(ids);
  setLocalCache(cacheKey, getLocalCache<T>(cacheKey).filter((x: any) => !idsSet.has(x.id)));
};

export const saveCategory = (cat: Category) => saveItem('categories', cat, STORAGE_KEYS.CATEGORIES);
export const deleteCategory = (id: string) => deleteItem<Category>('categories', id, STORAGE_KEYS.CATEGORIES);
export const deleteBulkCategories = (ids: string[]) => deleteMany<Category>('categories', ids, STORAGE_KEYS.CATEGORIES);

export const saveClassItem = (cls: ClassItem) => saveItem('classes', cls, STORAGE_KEYS.CLASSES);
export const deleteClassItem = (id: string) => deleteItem<ClassItem>('classes', id, STORAGE_KEYS.CLASSES);
export const deleteBulkClasses = (ids: string[]) => deleteMany<ClassItem>('classes', ids, STORAGE_KEYS.CLASSES);
export const saveBulkClasses = (classes: ClassItem[]) => saveMany('classes', classes, STORAGE_KEYS.CLASSES);

export const saveStudent = (student: Student) => saveItem('students', student, STORAGE_KEYS.STUDENTS);
export const saveBulkStudents = (students: Student[]) => saveMany('students', students, STORAGE_KEYS.STUDENTS);
export const deleteStudent = (id: string) => deleteItem<Student>('students', id, STORAGE_KEYS.STUDENTS);
export const deleteBulkStudents = (ids: string[]) => deleteMany<Student>('students', ids, STORAGE_KEYS.STUDENTS);

export const saveRoom = (room: Room) => saveItem('rooms', room, STORAGE_KEYS.ROOMS);
export const deleteRoom = (id: string) => deleteItem<Room>('rooms', id, STORAGE_KEYS.ROOMS);
export const deleteBulkRooms = (ids: string[]) => deleteMany<Room>('rooms', ids, STORAGE_KEYS.ROOMS);

export const saveSession = (sess: ExamSession) => saveItem('sessions', sess, STORAGE_KEYS.SESSIONS);
export const deleteSession = (id: string) => deleteItem<ExamSession>('sessions', id, STORAGE_KEYS.SESSIONS);

export const saveSeatingArrangement = (arr: SeatingArrangement) =>
  saveItem('seatingArrangements', arr, STORAGE_KEYS.SEATING);

export const subscribeAdminCredentials = (callback: (creds: AdminCredentials) => void) => {
  const credentialsRef = ref(db, 'settings/credentials');
  return onValue(
    credentialsRef,
    (snapshot) => {
      const data = snapshot.val() as AdminCredentials | null;
      if (data?.username && data?.password) {
        setLocalCache(STORAGE_KEYS.CREDENTIALS, data);
        callback(data);
      } else {
        callback(DEFAULT_CREDENTIALS);
      }
    },
    (error) => {
      console.error('Realtime Database credentials read error:', error);
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
        const cached = raw ? JSON.parse(raw) : null;
        callback(cached?.username && cached?.password ? cached : DEFAULT_CREDENTIALS);
      } catch {
        callback(DEFAULT_CREDENTIALS);
      }
    }
  );
};

export const saveAdminCredentials = async (creds: AdminCredentials) => {
  const cleanCreds = clean({ ...creds, updatedAt: new Date().toISOString() });
  await set(ref(db, 'settings/credentials'), cleanCreds);
  setLocalCache(STORAGE_KEYS.CREDENTIALS, cleanCreds);
};

export const exportAllDataJSON = async () => {
  const paths = ['categories', 'classes', 'students', 'rooms', 'sessions', 'seatingArrangements'];
  const backup: Record<string, unknown> = {
    boardName: 'Noorul Huda Examination Board',
    version: '2.0',
    exportDate: new Date().toISOString(),
  };

  for (const path of paths) {
    const snapshot = await get(ref(db, path));
    const value = snapshot.val() || {};
    backup[path] = Object.values(value);
  }

  return JSON.stringify(backup, null, 2);
};

export const importAllDataJSON = async (jsonString: string) => {
  const data = JSON.parse(jsonString);
  if (!data.categories || !data.classes || !data.students || !data.rooms) {
    throw new Error('Invalid backup file structure.');
  }

  const updates: Record<string, unknown> = {};
  const collections = ['categories', 'classes', 'students', 'rooms', 'sessions', 'seatingArrangements'];
  collections.forEach((collectionName) => {
    (data[collectionName] || []).forEach((item: { id: string }) => {
      updates[`${collectionName}/${item.id}`] = clean(item);
    });
  });

  if (Object.keys(updates).length) await update(ref(db), updates);
  return true;
};

export const clearAllData = async () => {
  const updates: Record<string, null> = {};
  ['categories', 'classes', 'students', 'rooms', 'sessions', 'seatingArrangements'].forEach((path) => {
    updates[path] = null;
  });
  await update(ref(db), updates);

  Object.values(STORAGE_KEYS).forEach((key) => {
    try { localStorage.removeItem(key); } catch {}
  });
};

// Small, optional demo seed. Real exam data is never created automatically.
export const seedSampleData = async () => {
  const now = new Date().toISOString();
  const categories: Category[] = [
    { id: 'cat-sec', name: 'Secondary', description: 'Classes 8th to 10th Standard', createdAt: now },
    { id: 'cat-srsec', name: 'Senior Secondary', description: 'Classes 11th & 12th Plus Two', createdAt: now },
    { id: 'cat-deg', name: 'Degree', description: 'Undergraduate Degree Courses', createdAt: now },
  ];

  const classes: ClassItem[] = [
    { id: 'cls-sec-s1', name: 'S1 (Class 8)', categoryId: 'cat-sec', createdAt: now },
    { id: 'cls-sec-s2', name: 'S2 (Class 9)', categoryId: 'cat-sec', createdAt: now },
    { id: 'cls-sec-s3', name: 'S3 (Class 10)', categoryId: 'cat-sec', createdAt: now },
    { id: 'cls-srsec-ss1', name: 'SS1 (Plus One)', categoryId: 'cat-srsec', createdAt: now },
    { id: 'cls-srsec-ss2', name: 'SS2 (Plus Two)', categoryId: 'cat-srsec', createdAt: now },
    { id: 'cls-deg-deg1', name: 'DEG1 (First Year)', categoryId: 'cat-deg', createdAt: now },
    { id: 'cls-deg-deg2', name: 'DEG2 (Second Year)', categoryId: 'cat-deg', createdAt: now },
  ];

  await saveMany('categories', categories, STORAGE_KEYS.CATEGORIES);
  await saveMany('classes', classes, STORAGE_KEYS.CLASSES);
};
