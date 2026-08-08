export type ExamMode = 'Manual' | 'Online';

export interface Category {
  id: string;
  name: string; // e.g., 'Secondary', 'Senior Secondary', 'Degree'
  description?: string;
  createdAt: string;
}

export interface ClassItem {
  id: string;
  name: string; // e.g., 'S1', 'SS1', 'DEG1'
  categoryId: string;
  createdAt: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  classId: string;
  createdAt: string;
}

export interface RoomSide {
  id: string;
  sideName: string; // e.g., 'Door Side', 'Window Side', 'Center Side'
  cols: number; // e.g., 4
  rows: number; // e.g., 3
}

export interface Room {
  id: string;
  name: string; // e.g., 'Room 101', 'Computer Lab 1'
  categoryId: string;
  examMode: ExamMode;
  // For manual rooms:
  sides?: RoomSide[];
  hasAisleBetweenSides?: boolean;
  // For online rooms:
  onlineCapacity?: number;
  onlineSlots?: string[]; // e.g., ['Slot 1', 'Slot 2']
  createdAt: string;
}

export interface ClassSessionConfig {
  classId: string;
  examMode: ExamMode;
}

export interface ExamSession {
  id: string;
  name: string; // e.g., 'Final Morning Session - Day 1'
  date: string; // YYYY-MM-DD
  time: string; // e.g., '09:30 AM - 12:30 PM'
  classConfigs: ClassSessionConfig[];
  createdAt: string;
}

export interface SeatAllocation {
  studentId: string;
  admissionNo: string;
  studentName: string;
  classId: string;
  className: string;
  categoryId: string;
  roomId: string;
  roomName: string;
  sideId?: string;
  sideName?: string;
  seatId: string; // e.g., 'A1', 'B2'
  colIndex: number;
  rowIndex: number;
}

export interface OnlineAllocation {
  studentId: string;
  admissionNo: string;
  studentName: string;
  classId: string;
  className: string;
  categoryId: string;
  roomId: string;
  roomName: string;
  slotName: string; // e.g. 'Slot 1'
}

export interface RoomClassSummary {
  classId: string;
  className: string;
  count: number;
}

export interface RoomDiagramData {
  roomId: string;
  roomName: string;
  categoryId: string;
  categoryName: string;
  totalStudents: number;
  sides: {
    sideId: string;
    sideName: string;
    cols: number;
    rows: number;
    grid: (SeatAllocation | null)[][]; // rows x cols grid
  }[];
  classSummary: RoomClassSummary[];
}

export interface ClassRoomDiagram {
  roomId: string;
  roomName: string;
  categoryId: string;
  categoryName: string;
  sides: {
    sideId: string;
    sideName: string;
    cols: number;
    rows: number;
    grid: (string | null)[][]; // rows x cols grid containing classId or null
  }[];
}

export interface SeatingArrangement {
  id: string;
  sessionId: string;
  generatedAt: string;
  manualAllocations: SeatAllocation[];
  onlineAllocations: OnlineAllocation[];
  roomDiagrams: RoomDiagramData[];
  roomSummaries: {
    roomId: string;
    roomName: string;
    classCounts: { [className: string]: number };
    total: number;
  }[];
}

export interface AppStats {
  totalCategories: number;
  totalClasses: number;
  totalStudents: number;
  totalRooms: number;
  totalSessions: number;
  todaysSessions: number;
  manualRoomCapacity: number;
  onlineRoomCapacity: number;
}

export interface AdminCredentials {
  username: string;
  password: string;
  updatedAt?: string;
}
