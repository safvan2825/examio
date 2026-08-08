import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Category, ClassItem, Student, Room, ExamSession, SeatingArrangement, AdminCredentials } from '../types';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firestore instance with explicit database ID if provided
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export { db };

// Default Admin Credentials as requested by user
export const DEFAULT_CREDENTIALS: AdminCredentials = {
  username: 'nhexam',
  password: 'exam2026',
};

// LocalStorage Fallback Keys
const STORAGE_KEYS = {
  CATEGORIES: 'nh_categories',
  CLASSES: 'nh_classes',
  STUDENTS: 'nh_students',
  ROOMS: 'nh_rooms',
  SESSIONS: 'nh_sessions',
  SEATING: 'nh_seating_arrangements',
  CREDENTIALS: 'nh_credentials',
};

// Helper to update local cache
const setLocalCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
};

const getLocalCache = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

// Real-time Firestore or Cached Data Subscribers
export const subscribeCategories = (callback: (data: Category[]) => void) => {
  try {
    const colRef = collection(db, 'categories');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data() as Category);
        items.sort((a, b) => a.name.localeCompare(b.name));
        setLocalCache(STORAGE_KEYS.CATEGORIES, items);
        callback(items);
      },
      (error) => {
        console.warn('Firestore categories read error, using local cache:', error);
        callback(getLocalCache<Category>(STORAGE_KEYS.CATEGORIES));
      }
    );
  } catch (err) {
    callback(getLocalCache<Category>(STORAGE_KEYS.CATEGORIES));
    return () => {};
  }
};

export const subscribeClasses = (callback: (data: ClassItem[]) => void) => {
  try {
    const colRef = collection(db, 'classes');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data() as ClassItem);
        items.sort((a, b) => a.name.localeCompare(b.name));
        setLocalCache(STORAGE_KEYS.CLASSES, items);
        callback(items);
      },
      (error) => {
        console.warn('Firestore classes error, using cache:', error);
        callback(getLocalCache<ClassItem>(STORAGE_KEYS.CLASSES));
      }
    );
  } catch (err) {
    callback(getLocalCache<ClassItem>(STORAGE_KEYS.CLASSES));
    return () => {};
  }
};

export const subscribeStudents = (callback: (data: Student[]) => void) => {
  try {
    const colRef = collection(db, 'students');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data() as Student);
        items.sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));
        setLocalCache(STORAGE_KEYS.STUDENTS, items);
        callback(items);
      },
      (error) => {
        console.warn('Firestore students error, using cache:', error);
        callback(getLocalCache<Student>(STORAGE_KEYS.STUDENTS));
      }
    );
  } catch (err) {
    callback(getLocalCache<Student>(STORAGE_KEYS.STUDENTS));
    return () => {};
  }
};

export const subscribeRooms = (callback: (data: Room[]) => void) => {
  try {
    const colRef = collection(db, 'rooms');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data() as Room);
        items.sort((a, b) => a.name.localeCompare(b.name));
        setLocalCache(STORAGE_KEYS.ROOMS, items);
        callback(items);
      },
      (error) => {
        console.warn('Firestore rooms error, using cache:', error);
        callback(getLocalCache<Room>(STORAGE_KEYS.ROOMS));
      }
    );
  } catch (err) {
    callback(getLocalCache<Room>(STORAGE_KEYS.ROOMS));
    return () => {};
  }
};

export const subscribeSessions = (callback: (data: ExamSession[]) => void) => {
  try {
    const colRef = collection(db, 'sessions');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data() as ExamSession);
        items.sort((a, b) => b.date.localeCompare(a.date));
        setLocalCache(STORAGE_KEYS.SESSIONS, items);
        callback(items);
      },
      (error) => {
        console.warn('Firestore sessions error, using cache:', error);
        callback(getLocalCache<ExamSession>(STORAGE_KEYS.SESSIONS));
      }
    );
  } catch (err) {
    callback(getLocalCache<ExamSession>(STORAGE_KEYS.SESSIONS));
    return () => {};
  }
};

export const subscribeSeatingArrangements = (
  callback: (data: SeatingArrangement[]) => void
) => {
  try {
    const colRef = collection(db, 'seatingArrangements');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data() as SeatingArrangement);
        setLocalCache(STORAGE_KEYS.SEATING, items);
        callback(items);
      },
      (error) => {
        console.warn('Firestore seating error, using cache:', error);
        callback(getLocalCache<SeatingArrangement>(STORAGE_KEYS.SEATING));
      }
    );
  } catch (err) {
    callback(getLocalCache<SeatingArrangement>(STORAGE_KEYS.SEATING));
    return () => {};
  }
};

// Helper to remove undefined fields before sending to Firestore
const cleanForFirestore = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// CRUD operations
export const saveCategory = async (cat: Category) => {
  const local = getLocalCache<Category>(STORAGE_KEYS.CATEGORIES);
  const idx = local.findIndex((item) => item.id === cat.id);
  if (idx >= 0) local[idx] = cat;
  else local.push(cat);
  setLocalCache(STORAGE_KEYS.CATEGORIES, local);

  try {
    await setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat));
  } catch (e) {
    console.error('Firestore saveCategory error:', e);
  }
};

export const deleteCategory = async (id: string) => {
  const local = getLocalCache<Category>(STORAGE_KEYS.CATEGORIES).filter(
    (item) => item.id !== id
  );
  setLocalCache(STORAGE_KEYS.CATEGORIES, local);

  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (e) {
    console.error('Firestore deleteCategory error:', e);
  }
};

export const deleteBulkCategories = async (ids: string[]) => {
  const setIds = new Set(ids);
  const local = getLocalCache<Category>(STORAGE_KEYS.CATEGORIES).filter(
    (item) => !setIds.has(item.id)
  );
  setLocalCache(STORAGE_KEYS.CATEGORIES, local);

  try {
    const chunkSize = 400;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => batch.delete(doc(db, 'categories', id)));
      await batch.commit();
    }
  } catch (e) {
    console.error('Firestore deleteBulkCategories error:', e);
  }
};

export const saveClassItem = async (cls: ClassItem) => {
  const local = getLocalCache<ClassItem>(STORAGE_KEYS.CLASSES);
  const idx = local.findIndex((item) => item.id === cls.id);
  if (idx >= 0) local[idx] = cls;
  else local.push(cls);
  setLocalCache(STORAGE_KEYS.CLASSES, local);

  try {
    await setDoc(doc(db, 'classes', cls.id), cleanForFirestore(cls));
  } catch (e) {
    console.error('Firestore saveClassItem error:', e);
  }
};

export const deleteClassItem = async (id: string) => {
  const local = getLocalCache<ClassItem>(STORAGE_KEYS.CLASSES).filter(
    (item) => item.id !== id
  );
  setLocalCache(STORAGE_KEYS.CLASSES, local);

  try {
    await deleteDoc(doc(db, 'classes', id));
  } catch (e) {
    console.error('Firestore deleteClassItem error:', e);
  }
};

export const deleteBulkClasses = async (ids: string[]) => {
  const setIds = new Set(ids);
  const local = getLocalCache<ClassItem>(STORAGE_KEYS.CLASSES).filter(
    (item) => !setIds.has(item.id)
  );
  setLocalCache(STORAGE_KEYS.CLASSES, local);

  try {
    const chunkSize = 400;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => batch.delete(doc(db, 'classes', id)));
      await batch.commit();
    }
  } catch (e) {
    console.error('Firestore deleteBulkClasses error:', e);
  }
};

export const saveBulkClasses = async (classes: ClassItem[]) => {
  const local = getLocalCache<ClassItem>(STORAGE_KEYS.CLASSES);
  const classMap = new Map<string, ClassItem>();
  local.forEach((c) => classMap.set(c.id, c));
  classes.forEach((c) => classMap.set(c.id, c));
  const merged = Array.from(classMap.values());
  setLocalCache(STORAGE_KEYS.CLASSES, merged);

  try {
    // Write in chunks of 400 for Firestore batch limits
    const chunkSize = 400;
    for (let i = 0; i < classes.length; i += chunkSize) {
      const chunk = classes.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((cls) => {
        batch.set(doc(db, 'classes', cls.id), cleanForFirestore(cls));
      });
      await batch.commit();
    }
  } catch (e) {
    console.error('Firestore saveBulkClasses error:', e);
  }
};

export const saveStudent = async (student: Student) => {
  const local = getLocalCache<Student>(STORAGE_KEYS.STUDENTS);
  const idx = local.findIndex((item) => item.id === student.id);
  if (idx >= 0) local[idx] = student;
  else local.push(student);
  setLocalCache(STORAGE_KEYS.STUDENTS, local);

  try {
    await setDoc(doc(db, 'students', student.id), cleanForFirestore(student));
  } catch (e) {
    console.error('Firestore saveStudent error:', e);
  }
};

export const saveBulkStudents = async (students: Student[]) => {
  const local = getLocalCache<Student>(STORAGE_KEYS.STUDENTS);
  const studentMap = new Map<string, Student>();
  local.forEach((s) => studentMap.set(s.id, s));
  students.forEach((s) => studentMap.set(s.id, s));
  const merged = Array.from(studentMap.values());
  setLocalCache(STORAGE_KEYS.STUDENTS, merged);

  try {
    // Write in chunks of 500 for Firestore batch limits
    const chunkSize = 400;
    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((st) => {
        batch.set(doc(db, 'students', st.id), cleanForFirestore(st));
      });
      await batch.commit();
    }
  } catch (e) {
    console.error('Firestore saveBulkStudents error:', e);
  }
};

export const deleteStudent = async (id: string) => {
  const local = getLocalCache<Student>(STORAGE_KEYS.STUDENTS).filter(
    (item) => item.id !== id
  );
  setLocalCache(STORAGE_KEYS.STUDENTS, local);

  try {
    await deleteDoc(doc(db, 'students', id));
  } catch (e) {
    console.error('Firestore deleteStudent error:', e);
  }
};

export const deleteBulkStudents = async (ids: string[]) => {
  const setIds = new Set(ids);
  const local = getLocalCache<Student>(STORAGE_KEYS.STUDENTS).filter(
    (item) => !setIds.has(item.id)
  );
  setLocalCache(STORAGE_KEYS.STUDENTS, local);

  try {
    const chunkSize = 400;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => batch.delete(doc(db, 'students', id)));
      await batch.commit();
    }
  } catch (e) {
    console.error('Firestore deleteBulkStudents error:', e);
  }
};

export const saveRoom = async (room: Room) => {
  const local = getLocalCache<Room>(STORAGE_KEYS.ROOMS);
  const idx = local.findIndex((item) => item.id === room.id);
  if (idx >= 0) local[idx] = room;
  else local.push(room);
  setLocalCache(STORAGE_KEYS.ROOMS, local);

  try {
    await setDoc(doc(db, 'rooms', room.id), cleanForFirestore(room));
  } catch (e) {
    console.error('Firestore saveRoom error:', e);
  }
};

export const deleteRoom = async (id: string) => {
  const local = getLocalCache<Room>(STORAGE_KEYS.ROOMS).filter(
    (item) => item.id !== id
  );
  setLocalCache(STORAGE_KEYS.ROOMS, local);

  try {
    await deleteDoc(doc(db, 'rooms', id));
  } catch (e) {
    console.error('Firestore deleteRoom error:', e);
  }
};

export const deleteBulkRooms = async (ids: string[]) => {
  const setIds = new Set(ids);
  const local = getLocalCache<Room>(STORAGE_KEYS.ROOMS).filter(
    (item) => !setIds.has(item.id)
  );
  setLocalCache(STORAGE_KEYS.ROOMS, local);

  try {
    const chunkSize = 400;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => batch.delete(doc(db, 'rooms', id)));
      await batch.commit();
    }
  } catch (e) {
    console.error('Firestore deleteBulkRooms error:', e);
  }
};

export const saveSession = async (sess: ExamSession) => {
  const local = getLocalCache<ExamSession>(STORAGE_KEYS.SESSIONS);
  const idx = local.findIndex((item) => item.id === sess.id);
  if (idx >= 0) local[idx] = sess;
  else local.push(sess);
  setLocalCache(STORAGE_KEYS.SESSIONS, local);

  try {
    await setDoc(doc(db, 'sessions', sess.id), cleanForFirestore(sess));
  } catch (e) {
    console.error('Firestore saveSession error:', e);
  }
};

export const deleteSession = async (id: string) => {
  const local = getLocalCache<ExamSession>(STORAGE_KEYS.SESSIONS).filter(
    (item) => item.id !== id
  );
  setLocalCache(STORAGE_KEYS.SESSIONS, local);

  try {
    await deleteDoc(doc(db, 'sessions', id));
  } catch (e) {
    console.error('Firestore deleteSession error:', e);
  }
};

export const saveSeatingArrangement = async (arr: SeatingArrangement) => {
  const local = getLocalCache<SeatingArrangement>(STORAGE_KEYS.SEATING);
  const idx = local.findIndex((item) => item.id === arr.id);
  if (idx >= 0) local[idx] = arr;
  else local.push(arr);
  setLocalCache(STORAGE_KEYS.SEATING, local);

  try {
    await setDoc(doc(db, 'seatingArrangements', arr.id), cleanForFirestore(arr));
  } catch (e) {
    console.error('Firestore saveSeatingArrangement error:', e);
  }
};

// Admin Credentials Operations
export const subscribeAdminCredentials = (callback: (creds: AdminCredentials) => void) => {
  const getCachedCreds = (): AdminCredentials => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.username && parsed?.password) return parsed;
      }
    } catch (e) {}
    return DEFAULT_CREDENTIALS;
  };

  try {
    const docRef = doc(db, 'settings', 'credentials');
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AdminCredentials;
          if (data && data.username && data.password) {
            setLocalCache(STORAGE_KEYS.CREDENTIALS, data);
            callback(data);
            return;
          }
        }
        // If not created yet in Firestore, use cached or default
        const current = getCachedCreds();
        callback(current);
      },
      (error) => {
        console.warn('Firestore admin credentials error, using cached:', error);
        callback(getCachedCreds());
      }
    );
  } catch (err) {
    callback(getCachedCreds());
    return () => {};
  }
};

export const saveAdminCredentials = async (creds: AdminCredentials) => {
  const clean = cleanForFirestore({
    ...creds,
    updatedAt: new Date().toISOString(),
  });
  setLocalCache(STORAGE_KEYS.CREDENTIALS, clean);

  try {
    await setDoc(doc(db, 'settings', 'credentials'), clean);
  } catch (e) {
    console.error('Firestore saveAdminCredentials error:', e);
  }
};

// Backup & Restore All App Data
export const exportAllDataJSON = () => {
  const backup = {
    boardName: 'Noorul Huda Examination Board',
    version: '1.0',
    exportDate: new Date().toISOString(),
    categories: getLocalCache<Category>(STORAGE_KEYS.CATEGORIES),
    classes: getLocalCache<ClassItem>(STORAGE_KEYS.CLASSES),
    students: getLocalCache<Student>(STORAGE_KEYS.STUDENTS),
    rooms: getLocalCache<Room>(STORAGE_KEYS.ROOMS),
    sessions: getLocalCache<ExamSession>(STORAGE_KEYS.SESSIONS),
    seatingArrangements: getLocalCache<SeatingArrangement>(STORAGE_KEYS.SEATING),
  };
  return JSON.stringify(backup, null, 2);
};

export const importAllDataJSON = async (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.categories || !data.classes || !data.students || !data.rooms) {
      throw new Error('Invalid backup file structure.');
    }

    // Update Local Storage
    setLocalCache(STORAGE_KEYS.CATEGORIES, data.categories || []);
    setLocalCache(STORAGE_KEYS.CLASSES, data.classes || []);
    setLocalCache(STORAGE_KEYS.STUDENTS, data.students || []);
    setLocalCache(STORAGE_KEYS.ROOMS, data.rooms || []);
    setLocalCache(STORAGE_KEYS.SESSIONS, data.sessions || []);
    setLocalCache(STORAGE_KEYS.SEATING, data.seatingArrangements || []);

    // Sync to Firestore
    for (const cat of data.categories || []) await setDoc(doc(db, 'categories', cat.id), cat);
    for (const cls of data.classes || []) await setDoc(doc(db, 'classes', cls.id), cls);
    for (const st of data.students || []) await setDoc(doc(db, 'students', st.id), st);
    for (const rm of data.rooms || []) await setDoc(doc(db, 'rooms', rm.id), rm);
    for (const sess of data.sessions || []) await setDoc(doc(db, 'sessions', sess.id), sess);
    for (const stg of data.seatingArrangements || [])
      await setDoc(doc(db, 'seatingArrangements', stg.id), stg);

    return true;
  } catch (err: any) {
    console.error('Import backup error:', err);
    throw err;
  }
};

// Clear All App Data permanently from Firestore and LocalStorage
export const clearAllData = async () => {
  // Clear local storage
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('LocalStorage remove error:', e);
    }
  });

  // Clear Firestore collections
  try {
    const collectionsToClear = [
      'categories',
      'classes',
      'students',
      'rooms',
      'sessions',
      'seatingArrangements',
    ];

    for (const colName of collectionsToClear) {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const chunkSize = 400;
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    }
  } catch (e) {
    console.error('Firestore clearAllData error:', e);
  }
};

// Seed Sample Demo Data for Noorul Huda Examination Board
export const seedSampleData = async () => {
  const categories: Category[] = [
    { id: 'cat-sec', name: 'Secondary', description: 'Classes 8th to 10th Standard', createdAt: new Date().toISOString() },
    { id: 'cat-srsec', name: 'Senior Secondary', description: 'Classes 11th & 12th Plus Two', createdAt: new Date().toISOString() },
    { id: 'cat-deg', name: 'Degree', description: 'Undergraduate Degree Courses', createdAt: new Date().toISOString() },
  ];

  const classes: ClassItem[] = [
    { id: 'cls-sec-s1', name: 'S1 (Class 8)', categoryId: 'cat-sec', createdAt: new Date().toISOString() },
    { id: 'cls-sec-s2', name: 'S2 (Class 9)', categoryId: 'cat-sec', createdAt: new Date().toISOString() },
    { id: 'cls-sec-s3', name: 'S3 (Class 10)', categoryId: 'cat-sec', createdAt: new Date().toISOString() },
    { id: 'cls-srsec-ss1', name: 'SS1 (Plus One)', categoryId: 'cat-srsec', createdAt: new Date().toISOString() },
    { id: 'cls-srsec-ss2', name: 'SS2 (Plus Two)', categoryId: 'cat-srsec', createdAt: new Date().toISOString() },
    { id: 'cls-deg-deg1', name: 'DEG1 (First Year)', categoryId: 'cat-deg', createdAt: new Date().toISOString() },
    { id: 'cls-deg-deg2', name: 'DEG2 (Second Year)', categoryId: 'cat-deg', createdAt: new Date().toISOString() },
  ];

  // Generate 25 students per class = 175 total students with admission numbers NH-1001 upwards
  let admCounter = 1001;
  const sampleFirstNames = [
    'Ahmad', 'Muhammed', 'Fatimah', 'Aisha', 'Umar', 'Ali', 'Zayd', 'Bilal',
    'Yusuf', 'Hamza', 'Maryam', 'Khadijah', 'Zahra', 'Ibrahim', 'Hassan', 'Hussain',
    'Tariq', 'Khalid', 'Sufyan', 'Salim', 'Rayan', 'Sumayya', 'Safia', 'Noura', 'Nu'
  ];
  const sampleLastNames = [
    'Hassan', 'Rahman', 'Khan', 'Sayyid', 'Shareef', 'Nazar', 'Aziz', 'Farooc',
    'Huda', 'Usman', 'Saad', 'Malik', 'Anwar', 'Basha', 'Thani'
  ];

  const students: Student[] = [];
  classes.forEach((cls) => {
    for (let i = 1; i <= 20; i++) {
      const fName = sampleFirstNames[(admCounter + i) % sampleFirstNames.length];
      const lName = sampleLastNames[(admCounter * 3 + i) % sampleLastNames.length];
      students.push({
        id: `st-${cls.id}-${i}`,
        admissionNo: `NH-${admCounter}`,
        name: `${fName} ${lName}`,
        classId: cls.id,
        createdAt: new Date().toISOString(),
      });
      admCounter++;
    }
  });

  const rooms: Room[] = [
    // Secondary Manual Rooms
    {
      id: 'rm-sec-101',
      name: 'Room 101 (Secondary)',
      categoryId: 'cat-sec',
      examMode: 'Manual',
      sides: [
        { id: 's1', sideName: 'Door Side', cols: 3, rows: 5 },
        { id: 's2', sideName: 'Window Side', cols: 3, rows: 5 },
      ],
      hasAisleBetweenSides: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rm-sec-102',
      name: 'Room 102 (Secondary)',
      categoryId: 'cat-sec',
      examMode: 'Manual',
      sides: [
        { id: 's1', sideName: 'Door Side', cols: 3, rows: 5 },
        { id: 's2', sideName: 'Window Side', cols: 3, rows: 5 },
      ],
      hasAisleBetweenSides: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rm-sec-103',
      name: 'Room 103 (Secondary)',
      categoryId: 'cat-sec',
      examMode: 'Manual',
      sides: [
        { id: 's1', sideName: 'Door Side', cols: 2, rows: 5 },
        { id: 's2', sideName: 'Window Side', cols: 2, rows: 5 },
      ],
      hasAisleBetweenSides: true,
      createdAt: new Date().toISOString(),
    },
    // Senior Secondary Manual Rooms
    {
      id: 'rm-srsec-201',
      name: 'Room 201 (Senior Sec)',
      categoryId: 'cat-srsec',
      examMode: 'Manual',
      sides: [
        { id: 's1', sideName: 'Door Side', cols: 3, rows: 5 },
        { id: 's2', sideName: 'Window Side', cols: 3, rows: 5 },
      ],
      hasAisleBetweenSides: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rm-srsec-202',
      name: 'Room 202 (Senior Sec)',
      categoryId: 'cat-srsec',
      examMode: 'Manual',
      sides: [
        { id: 's1', sideName: 'Door Side', cols: 3, rows: 5 },
        { id: 's2', sideName: 'Window Side', cols: 3, rows: 5 },
      ],
      hasAisleBetweenSides: true,
      createdAt: new Date().toISOString(),
    },
    // Degree Manual Rooms
    {
      id: 'rm-deg-301',
      name: 'Room 301 (Degree Hall)',
      categoryId: 'cat-deg',
      examMode: 'Manual',
      sides: [
        { id: 's1', sideName: 'Left Wing', cols: 4, rows: 5 },
        { id: 's2', sideName: 'Right Wing', cols: 4, rows: 5 },
      ],
      hasAisleBetweenSides: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rm-deg-302',
      name: 'Room 302 (Degree Hall)',
      categoryId: 'cat-deg',
      examMode: 'Manual',
      sides: [
        { id: 's1', sideName: 'Left Wing', cols: 3, rows: 5 },
        { id: 's2', sideName: 'Right Wing', cols: 3, rows: 5 },
      ],
      hasAisleBetweenSides: true,
      createdAt: new Date().toISOString(),
    },
    // Online Computer Lab
    {
      id: 'rm-online-lab1',
      name: 'Computer Lab 1 (Online)',
      categoryId: 'cat-sec',
      examMode: 'Online',
      onlineCapacity: 30,
      onlineSlots: ['Slot 1 (09:00 AM)', 'Slot 2 (11:00 AM)', 'Slot 3 (02:00 PM)'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'rm-online-lab2',
      name: 'Digital Lab 2 (Online)',
      categoryId: 'cat-srsec',
      examMode: 'Online',
      onlineCapacity: 30,
      onlineSlots: ['Slot 1 (09:00 AM)', 'Slot 2 (11:00 AM)'],
      createdAt: new Date().toISOString(),
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const sessions: ExamSession[] = [
    {
      id: 'sess-today-1',
      name: 'Annual Board Exam - Morning Session',
      date: todayStr,
      time: '09:30 AM - 12:30 PM',
      classConfigs: [
        { classId: 'cls-sec-s1', examMode: 'Manual' },
        { classId: 'cls-sec-s2', examMode: 'Manual' },
        { classId: 'cls-sec-s3', examMode: 'Manual' },
        { classId: 'cls-srsec-ss1', examMode: 'Manual' },
        { classId: 'cls-srsec-ss2', examMode: 'Manual' },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sess-today-2',
      name: 'Degree Term Examination & Online Quiz',
      date: todayStr,
      time: '01:30 PM - 04:30 PM',
      classConfigs: [
        { classId: 'cls-deg-deg1', examMode: 'Manual' },
        { classId: 'cls-deg-deg2', examMode: 'Manual' },
        { classId: 'cls-sec-s1', examMode: 'Online' },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  // Save to Local Cache
  setLocalCache(STORAGE_KEYS.CATEGORIES, categories);
  setLocalCache(STORAGE_KEYS.CLASSES, classes);
  setLocalCache(STORAGE_KEYS.STUDENTS, students);
  setLocalCache(STORAGE_KEYS.ROOMS, rooms);
  setLocalCache(STORAGE_KEYS.SESSIONS, sessions);

  // Sync to Firestore
  try {
    for (const c of categories) await saveCategory(c);
    for (const cl of classes) await saveClassItem(cl);
    await saveBulkStudents(students);
    for (const r of rooms) await saveRoom(r);
    for (const s of sessions) await saveSession(s);
  } catch (err) {
    console.warn('Error seeding firestore demo data:', err);
  }
};
