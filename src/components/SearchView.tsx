import React, { useState } from 'react';
import { Search as SearchIcon, Users, Grid, Calendar, GraduationCap } from 'lucide-react';
import { Student, ClassItem, Category, Room, ExamSession, SeatingArrangement } from '../types';

interface SearchViewProps {
  students: Student[];
  classes: ClassItem[];
  categories: Category[];
  rooms: Room[];
  sessions: ExamSession[];
  arrangements: SeatingArrangement[];
}

export const SearchView: React.FC<SearchViewProps> = ({
  students,
  classes,
  categories,
  rooms,
  sessions,
  arrangements,
}) => {
  const [query, setQuery] = useState('');

  const classMap = new Map<string, ClassItem>();
  classes.forEach((c) => classMap.set(c.id, c));

  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  const roomMap = new Map<string, Room>();
  rooms.forEach((r) => roomMap.set(r.id, r));

  const sessionMap = new Map<string, ExamSession>();
  sessions.forEach((s) => sessionMap.set(s.id, s));

  // Perform search across students, room allocations, sessions, classes
  const cleanQ = query.trim().toLowerCase();

  // Search in seating allocations
  const seatingResults: {
    studentName: string;
    admissionNo: string;
    className: string;
    roomName: string;
    seatId: string;
    sessionName: string;
    mode: string;
  }[] = [];

  if (cleanQ.length >= 2) {
    arrangements.forEach((arr) => {
      const sess = sessionMap.get(arr.sessionId);
      const sessName = sess ? sess.name : 'Session';

      arr.manualAllocations.forEach((alloc) => {
        if (
          alloc.studentName.toLowerCase().includes(cleanQ) ||
          alloc.admissionNo.toLowerCase().includes(cleanQ) ||
          alloc.className.toLowerCase().includes(cleanQ) ||
          alloc.roomName.toLowerCase().includes(cleanQ) ||
          alloc.seatId.toLowerCase().includes(cleanQ) ||
          sessName.toLowerCase().includes(cleanQ)
        ) {
          seatingResults.push({
            studentName: alloc.studentName,
            admissionNo: alloc.admissionNo,
            className: alloc.className,
            roomName: alloc.roomName,
            seatId: alloc.seatId,
            sessionName: sessName,
            mode: 'Manual',
          });
        }
      });

      arr.onlineAllocations.forEach((alloc) => {
        if (
          alloc.studentName.toLowerCase().includes(cleanQ) ||
          alloc.admissionNo.toLowerCase().includes(cleanQ) ||
          alloc.className.toLowerCase().includes(cleanQ) ||
          alloc.roomName.toLowerCase().includes(cleanQ) ||
          alloc.slotName.toLowerCase().includes(cleanQ) ||
          sessName.toLowerCase().includes(cleanQ)
        ) {
          seatingResults.push({
            studentName: alloc.studentName,
            admissionNo: alloc.admissionNo,
            className: alloc.className,
            roomName: alloc.roomName,
            seatId: alloc.slotName,
            sessionName: sessName,
            mode: 'Online',
          });
        }
      });
    });
  }

  // Student register search
  const matchingStudents = cleanQ.length >= 2
    ? students.filter((s) => {
        const cls = classMap.get(s.classId);
        return (
          s.name.toLowerCase().includes(cleanQ) ||
          s.admissionNo.toLowerCase().includes(cleanQ) ||
          (cls && cls.name.toLowerCase().includes(cleanQ))
        );
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Universal Search</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search student registers, assigned seat IDs, rooms, classes, or exam sessions.
          </p>
        </div>

        <div className="relative">
          <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Admission No (e.g. NH-1001), Student Name, Seat ID (e.g. A1), Room, or Class..."
            className="w-full text-sm pl-11 pr-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {cleanQ.length >= 2 && (
        <div className="space-y-6">
          {/* Seating Allocations Results */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
              <Grid className="w-4 h-4 mr-2 text-emerald-600" />
              Assigned Seat Results ({seatingResults.length})
            </h3>

            {seatingResults.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                No generated seating records match your search criteria.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Admission No</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">Class</th>
                      <th className="py-2 px-3">Room</th>
                      <th className="py-2 px-3">Seat ID</th>
                      <th className="py-2 px-3">Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seatingResults.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.admissionNo}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{r.studentName}</td>
                        <td className="py-2 px-3">{r.className}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{r.roomName}</td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{r.seatId}</td>
                        <td className="py-2 px-3 text-slate-600">{r.sessionName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Register Matches */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2 text-blue-600" />
              Student Register Matches ({matchingStudents.length})
            </h3>

            {matchingStudents.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No student register profiles match.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {matchingStudents.map((s) => {
                  const cls = classMap.get(s.classId);
                  return (
                    <div key={s.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900">{s.admissionNo}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-medium">
                          {cls ? cls.name : 'Class'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">{s.name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
