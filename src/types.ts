export type ExamMode = 'Manual' | 'Online';

export interface Category { id: string; name: string; description?: string; createdAt: string; }
export interface ClassItem { id: string; name: string; categoryId: string; createdAt: string; }
export interface Student { id: string; admissionNo: string; name: string; classId: string; createdAt: string; }

export interface Subject { id: string; name: string; createdAt: string; updatedAt?: string; }
export interface AbsenteeRecord {
  id: string; studentId: string; admissionNo: string; studentName: string;
  classId: string; className: string; subjectId: string; subjectName: string;
  date: string; createdAt: string; updatedAt: string;
}

export interface RoomSide { id: string; sideName: string; cols: number; rows: number; }
export interface Room {
  id: string; name: string; categoryId: string; examMode: ExamMode;
  sides?: RoomSide[]; hasAisleBetweenSides?: boolean;
  onlineCapacity?: number; onlineSlots?: string[]; createdAt: string;
}
export interface ClassSessionConfig { classId: string; examMode: ExamMode; }
export interface ExamSession { id: string; name: string; date: string; time: string; classConfigs: ClassSessionConfig[]; createdAt: string; }

export interface SeatAllocation {
  studentId: string; admissionNo: string; studentName: string; classId: string; className: string;
  categoryId: string; roomId: string; roomName: string; sideId?: string; sideName?: string;
  seatId: string; colIndex: number; rowIndex: number;
}
export interface OnlineAllocation {
  studentId: string; admissionNo: string; studentName: string; classId: string; className: string;
  categoryId: string; roomId: string; roomName: string; slotName: string;
}
export interface RoomClassSummary { classId: string; className: string; count: number; }
export interface RoomDiagramData {
  roomId: string; roomName: string; categoryId: string; categoryName: string; totalStudents: number;
  sides: { sideId: string; sideName: string; cols: number; rows: number; grid: (SeatAllocation | null)[][] }[];
  classSummary: RoomClassSummary[];
}
export interface ClassRoomDiagram {
  roomId: string; roomName: string; categoryId: string; categoryName: string;
  sides: { sideId: string; sideName: string; cols: number; rows: number; grid: (string | null)[][] }[];
}
export interface SeatingArrangement {
  id: string; sessionId: string; generatedAt: string; manualAllocations: SeatAllocation[];
  onlineAllocations: OnlineAllocation[]; roomDiagrams: RoomDiagramData[];
  roomSummaries: { roomId: string; roomName: string; classCounts: { [className: string]: number }; total: number }[];
}
export interface AppStats {
  totalCategories: number; totalClasses: number; totalStudents: number; totalRooms: number;
  totalSessions: number; todaysSessions: number; manualRoomCapacity: number; onlineRoomCapacity: number;
}
export interface AdminCredentials { username: string; password: string; updatedAt?: string; }
