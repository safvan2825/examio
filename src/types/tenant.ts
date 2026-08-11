export interface Campus {
  id: string;
  ownerId: string;
  name: string;
  code?: string;
  place?: string;
  district?: string;
  state?: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Examination {
  id: string;
  campusId: string;
  name: string;
  academicYear?: string;
  startDate: string;
  endDate: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ExamTimetableEntry {
  id: string;
  examinationId: string;
  date: string;
  classId: string;
  subjectId: string;
  startTime?: string;
  endTime?: string;
  roomIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExamAbsenteeRecord {
  id: string;
  examinationId: string;
  sessionId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  classId: string;
  subjectId: string;
  studentId: string;
  admissionNo: string;
  studentName: string;
  createdAt: string;
  updatedAt: string;
}
