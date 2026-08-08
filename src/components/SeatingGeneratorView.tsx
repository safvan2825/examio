import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  Printer,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  ExamSession,
  Student,
  ClassItem,
  Category,
  Room,
  SeatingArrangement,
  ClassRoomDiagram,
} from '../types';
import {
  generateClassAllocationDiagrams,
  populateStudentsFromClassDiagrams,
  generateSeatingArrangement,
} from '../lib/seatingAlgorithm';
import {
  generateStudentWiseSeatingPDF,
  exportSeatingToExcel,
  exportSeatingToCSV,
} from '../lib/pdfGenerator';

interface SeatingGeneratorViewProps {
  sessions: ExamSession[];
  students: Student[];
  classes: ClassItem[];
  categories: Category[];
  rooms: Room[];
  arrangements: SeatingArrangement[];
  selectedSessionIdFromNav?: string;
  onSaveArrangement: (arr: SeatingArrangement) => Promise<void>;
  onOpenPrintModal: (
    type: 'roomDiagram' | 'studentList',
    session: ExamSession,
    arrangement: SeatingArrangement
  ) => void;
}

const CLASS_PALETTES = [
  { bg: 'bg-indigo-50 border-indigo-300 text-indigo-950', badge: 'bg-indigo-600 text-white' },
  { bg: 'bg-emerald-50 border-emerald-300 text-emerald-950', badge: 'bg-emerald-600 text-white' },
  { bg: 'bg-amber-50 border-amber-300 text-amber-950', badge: 'bg-amber-600 text-white' },
  { bg: 'bg-purple-50 border-purple-300 text-purple-950', badge: 'bg-purple-600 text-white' },
  { bg: 'bg-rose-50 border-rose-300 text-rose-950', badge: 'bg-rose-600 text-white' },
  { bg: 'bg-cyan-50 border-cyan-300 text-cyan-950', badge: 'bg-cyan-600 text-white' },
  { bg: 'bg-orange-50 border-orange-300 text-orange-950', badge: 'bg-orange-600 text-white' },
  { bg: 'bg-teal-50 border-teal-300 text-teal-950', badge: 'bg-teal-600 text-white' },
  { bg: 'bg-blue-50 border-blue-300 text-blue-950', badge: 'bg-blue-600 text-white' },
  { bg: 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-950', badge: 'bg-fuchsia-600 text-white' },
];

const getColumnLetter = (index: number): string => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

export const SeatingGeneratorView: React.FC<SeatingGeneratorViewProps> = ({
  sessions,
  students,
  classes,
  categories,
  rooms,
  arrangements,
  selectedSessionIdFromNav,
  onSaveArrangement,
  onOpenPrintModal,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    selectedSessionIdFromNav || (sessions.length > 0 ? sessions[0].id : '')
  );

  useEffect(() => {
    if (selectedSessionIdFromNav) {
      setSelectedSessionId(selectedSessionIdFromNav);
    }
  }, [selectedSessionIdFromNav]);

  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const existingArrangement = arrangements.find((a) => a.sessionId === selectedSessionId);

  const [activeTab, setActiveTab] = useState<'rooms' | 'students'>('rooms');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);

  // Class diagram state for interactive editing stage
  const [classDiagrams, setClassDiagrams] = useState<ClassRoomDiagram[] | null>(null);
  const [viewStage, setViewStage] = useState<'none' | 'classLayout' | 'finalSeating'>('none');

  // Sync state when session or existing arrangement changes
  useEffect(() => {
    if (existingArrangement) {
      setViewStage('finalSeating');
    } else {
      setViewStage('none');
      setClassDiagrams(null);
    }
  }, [selectedSessionId, existingArrangement]);

  const getClassPalette = (classId: string | null) => {
    if (!classId) {
      return {
        bg: 'bg-slate-50 border-dashed border-slate-200 text-slate-400',
        badge: 'bg-slate-200 text-slate-700',
      };
    }
    const idx = classes.findIndex((c) => c.id === classId);
    const safeIdx = idx >= 0 ? idx : 0;
    return CLASS_PALETTES[safeIdx % CLASS_PALETTES.length];
  };

  // Run Allocation -> Step 1: Create Class Diagram Layout
  const handleRunGenerator = () => {
    if (!currentSession) return;
    setIsGenerating(true);

    try {
      const { classDiagrams: diagrams, warnings } = generateClassAllocationDiagrams(
        currentSession,
        students,
        classes,
        categories,
        rooms
      );

      setGenerationWarnings(warnings);
      setClassDiagrams(diagrams);
      setViewStage('classLayout');
    } catch (err: any) {
      console.error('Class allocation error:', err);
      alert('Error allocating classes to room diagram: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2 -> Approve Class Diagram Layout & Populate Final Student Seating
  const handleApproveAndPopulate = async () => {
    if (!currentSession || !classDiagrams) return;
    setIsGenerating(true);

    try {
      const finalArrangement = populateStudentsFromClassDiagrams(
        classDiagrams,
        currentSession,
        students,
        classes,
        categories,
        rooms
      );

      await onSaveArrangement(finalArrangement);
      setViewStage('finalSeating');
    } catch (err: any) {
      console.error('Population error:', err);
      alert('Error generating seating layout: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Modify individual box class assignment in classDiagrams
  const handleSeatClassChange = (
    roomId: string,
    sideId: string,
    rowIndex: number,
    colIndex: number,
    newClassId: string
  ) => {
    if (!classDiagrams) return;
    setClassDiagrams((prev) => {
      if (!prev) return null;
      return prev.map((rm) => {
        if (rm.roomId !== roomId) return rm;
        return {
          ...rm,
          sides: rm.sides.map((sd) => {
            if (sd.sideId !== sideId) return sd;
            const newGrid = sd.grid.map((row, rIdx) => {
              if (rIdx !== rowIndex) return row;
              return row.map((clsId, cIdx) => (cIdx === colIndex ? newClassId || null : clsId));
            });
            return { ...sd, grid: newGrid };
          }),
        };
      });
    });
  };

  // Compute live capacity & class stats for pre-summary or class layout
  let preSummary = {
    totalStudents: 0,
    manualStudents: 0,
    onlineStudents: 0,
    manualCap: 0,
    onlineCap: 0,
    reqRooms: 0,
  };

  const classMap = new Map<string, ClassItem>();
  classes.forEach((c) => classMap.set(c.id, c));

  let sessionManualClasses: ClassItem[] = [];
  if (currentSession) {
    const manualClsIds = new Set<string>(
      currentSession.classConfigs.filter((c) => c.examMode === 'Manual').map((c) => c.classId)
    );
    const onlineClsIds = new Set<string>(
      currentSession.classConfigs.filter((c) => c.examMode === 'Online').map((c) => c.classId)
    );

    sessionManualClasses = classes.filter((c) => manualClsIds.has(c.id));

    const manualSt = students.filter((s) => manualClsIds.has(s.classId));
    const onlineSt = students.filter((s) => onlineClsIds.has(s.classId));

    const activeCats = new Set<string>();
    manualClsIds.forEach((cId) => {
      const cls = classMap.get(cId);
      if (cls) activeCats.add(cls.categoryId);
    });

    let mCap = 0;
    rooms
      .filter((r) => r.examMode === 'Manual' && activeCats.has(r.categoryId))
      .forEach((r) => r.sides?.forEach((s) => (mCap += s.cols * s.rows)));

    let oCap = 0;
    rooms
      .filter((r) => r.examMode === 'Online')
      .forEach((r) => {
        const slots = r.onlineSlots?.length || 1;
        oCap += (r.onlineCapacity || 0) * slots;
      });

    preSummary = {
      totalStudents: manualSt.length + onlineSt.length,
      manualStudents: manualSt.length,
      onlineStudents: onlineSt.length,
      manualCap: mCap,
      onlineCap: oCap,
      reqRooms: Math.max(activeCats.size, Math.ceil(manualSt.length / 30)),
    };
  }

  // Calculate live allocated seats per class in classDiagrams
  const classAllocationCounts = new Map<string, number>();
  if (classDiagrams) {
    classDiagrams.forEach((rm) => {
      rm.sides.forEach((sd) => {
        sd.grid.forEach((row) => {
          row.forEach((cId) => {
            if (cId) {
              classAllocationCounts.set(cId, (classAllocationCounts.get(cId) || 0) + 1);
            }
          });
        });
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Session Selection & Generator Control Bar */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Seating Generator
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Select an exam session and run auto allocation to calculate room layout and seating rules.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Select Exam Session --</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} ({s.time})
                </option>
              ))}
            </select>

            <button
              onClick={handleRunGenerator}
              disabled={!currentSession || isGenerating}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs flex items-center transition shrink-0"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              {isGenerating ? 'Allocating...' : 'Run Allocation'}
            </button>
          </div>
        </div>

        {/* Live Capacity Summary Cards */}
        {currentSession && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total Students
              </span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{preSummary.totalStudents}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                Manual Students
              </span>
              <p className="text-xl font-bold text-emerald-900 mt-0.5">{preSummary.manualStudents}</p>
            </div>
            <div className="p-3 rounded-lg bg-cyan-50/60 border border-cyan-200/80 shadow-2xs">
              <span className="text-[10px] text-cyan-700 font-bold uppercase tracking-wider">
                Online Students
              </span>
              <p className="text-xl font-bold text-cyan-900 mt-0.5">{preSummary.onlineStudents}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Manual Capacity
              </span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{preSummary.manualCap}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Online Capacity
              </span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{preSummary.onlineCap}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/80 shadow-2xs">
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                Est. Rooms
              </span>
              <p className="text-xl font-bold text-indigo-900 mt-0.5">{preSummary.reqRooms}</p>
            </div>
          </div>
        )}
      </div>

      {/* Warnings & Notices */}
      {generationWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs space-y-1">
          <p className="font-bold flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" /> System Notices:
          </p>
          {generationWarnings.map((w, idx) => (
            <p key={idx} className="pl-6">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* STAGE 1: CLASS ALLOCATION INTERACTIVE DIAGRAM VIEW */}
      {viewStage === 'classLayout' && classDiagrams && currentSession && (
        <div className="space-y-6">
          {/* Class Layout Header & Action Bar */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Step 1 of 2
                  </span>
                  <h3 className="text-base font-bold">Class Allocation Diagram (Editable)</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Boxes are color-coded by class to ensure non-adjacent conflict-free patterns. Click on any box to customize its assigned class.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={handleRunGenerator}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center transition border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reset Auto Allocation
                </button>

                <button
                  onClick={handleApproveAndPopulate}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center transition shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5 fill-slate-950 text-emerald-400" />
                  Approve Layout & Generate Seating
                </button>
              </div>
            </div>

            {/* Class Legend & Live Counts */}
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                Classes in Session & Allocated Seats:
              </span>
              <div className="flex flex-wrap gap-2">
                {sessionManualClasses.map((cls) => {
                  const palette = getClassPalette(cls.id);
                  const classStCount = students.filter((s) => s.classId === cls.id).length;
                  const allocatedCount = classAllocationCounts.get(cls.id) || 0;
                  const isMatched = allocatedCount >= classStCount;

                  return (
                    <div
                      key={cls.id}
                      className="px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs flex items-center space-x-2"
                    >
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${palette.badge}`}>
                        {cls.name}
                      </span>
                      <span className="text-slate-200 font-mono font-medium text-[11px]">
                        {allocatedCount} / {classStCount} Seats
                      </span>
                      {isMatched ? (
                        <span className="text-emerald-400 text-[10px] font-bold">✓</span>
                      ) : (
                        <span className="text-amber-400 text-[10px] font-bold">!</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Class Room Diagrams */}
          <div className="space-y-6">
            {classDiagrams.map((roomDiag) => {
              const allowedClassesForRoom = classes.filter(
                (c) =>
                  c.categoryId === roomDiag.categoryId &&
                  currentSession.classConfigs.some((cfg) => cfg.classId === c.id && cfg.examMode === 'Manual')
              );

              return (
                <div
                  key={roomDiag.roomId}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-slate-900">{roomDiag.roomName}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {roomDiag.categoryName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Class Layout Box Pattern
                      </p>
                    </div>
                  </div>

                  {/* Room Visual Side Grids */}
                  <div className="flex flex-wrap gap-6 items-start overflow-x-auto py-2">
                    {roomDiag.sides.map((side) => (
                      <div
                        key={side.sideId}
                        className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 shrink-0"
                      >
                        <h4 className="text-xs font-bold text-slate-700 mb-3 text-center border-b border-slate-200 pb-1">
                          {side.sideName} ({side.cols}×{side.rows})
                        </h4>

                        <div
                          className="grid gap-2"
                          style={{
                            gridTemplateColumns: `repeat(${side.cols}, minmax(0, 1fr))`,
                          }}
                        >
                          {side.grid.map((row, rIdx) =>
                            row.map((cId, cIdx) => {
                              const seatId = `${getColumnLetter(cIdx)}${rIdx + 1}`;
                              const palette = getClassPalette(cId);

                              return (
                                <div
                                  key={`${rIdx}-${cIdx}`}
                                  className={`w-28 p-2 rounded-xl border text-[10px] flex flex-col justify-between transition-all ${palette.bg}`}
                                >
                                  <div className="flex items-center justify-between font-bold opacity-80 mb-1">
                                    <span className="font-mono">{seatId}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${palette.badge}`}
                                    >
                                      {cId ? (classMap.get(cId)?.name || 'Class') : 'Empty'}
                                    </span>
                                  </div>

                                  <select
                                    value={cId || ''}
                                    onChange={(e) =>
                                      handleSeatClassChange(
                                        roomDiag.roomId,
                                        side.sideId,
                                        rIdx,
                                        cIdx,
                                        e.target.value
                                      )
                                    }
                                    className="w-full text-[10px] font-semibold py-1 px-1 rounded-lg border border-slate-300 bg-white/90 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                                  >
                                    <option value="">-- Empty --</option>
                                    {allowedClassesForRoom.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STAGE 2: FINAL SEATING ARRANGEMENT VIEW */}
      {viewStage === 'finalSeating' && existingArrangement && currentSession && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center space-x-2 border-b sm:border-b-0 pb-2 sm:pb-0">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'rooms'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Room Diagram Views ({existingArrangement.roomDiagrams.length})
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'students'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Student Seating List (
                {existingArrangement.manualAllocations.length +
                  existingArrangement.onlineAllocations.length}
                )
              </button>

              <button
                onClick={handleRunGenerator}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl flex items-center transition border border-blue-200"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Modify Class Layout
              </button>
            </div>

            {/* Print & Download Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenPrintModal('roomDiagram', currentSession, existingArrangement)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center transition"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Print Room Diagram PDF
              </button>

              <button
                onClick={() => onOpenPrintModal('studentList', currentSession, existingArrangement)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl flex items-center transition"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                Print Student List PDF
              </button>

              <button
                onClick={() =>
                  generateStudentWiseSeatingPDF(
                    currentSession,
                    existingArrangement,
                    categories,
                    classes
                  )
                }
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-xl flex items-center border border-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
                PDF
              </button>

              <button
                onClick={() => exportSeatingToExcel(currentSession, existingArrangement, categories)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium rounded-xl flex items-center transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Excel
              </button>

              <button
                onClick={() => exportSeatingToCSV(currentSession, existingArrangement, categories)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium rounded-xl flex items-center transition"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-blue-600" />
                CSV
              </button>
            </div>
          </div>

          {/* TAB 1: ROOM DIAGRAM VIEWS (WITH STUDENTS) */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {existingArrangement.roomDiagrams.map((roomDiag) => (
                <div
                  key={roomDiag.roomId}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-slate-900">{roomDiag.roomName}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {roomDiag.categoryName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Allocated Students: <strong className="text-slate-800">{roomDiag.totalStudents}</strong>
                      </p>
                    </div>

                    {/* Room Summary Badge */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {roomDiag.classSummary.map((cs) => (
                        <span
                          key={cs.className}
                          className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-medium text-slate-700"
                        >
                          {cs.className}: <strong>{cs.count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Room Visual Layout Grid */}
                  <div className="flex flex-wrap gap-6 items-start overflow-x-auto py-2">
                    {roomDiag.sides.map((side) => (
                      <div
                        key={side.sideId}
                        className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 shrink-0"
                      >
                        <h4 className="text-xs font-bold text-slate-700 mb-3 text-center border-b border-slate-200 pb-1">
                          {side.sideName} ({side.cols}×{side.rows})
                        </h4>

                        <div
                          className="grid gap-1.5"
                          style={{
                            gridTemplateColumns: `repeat(${side.cols}, minmax(0, 1fr))`,
                          }}
                        >
                          {side.grid.map((row, rIdx) =>
                            row.map((seat, cIdx) => (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                className={`w-24 p-2 rounded-lg border text-[10px] flex flex-col justify-between ${
                                  seat
                                    ? 'bg-indigo-50/80 border-indigo-200 text-slate-900 shadow-2xs'
                                    : 'bg-white border-dashed border-slate-200 text-slate-300'
                                }`}
                              >
                                {seat ? (
                                  <>
                                    <div className="flex items-center justify-between font-bold text-indigo-900">
                                      <span>{seat.seatId}</span>
                                      <span className="text-[9px] bg-indigo-200/80 px-1 rounded text-indigo-900">
                                        {seat.className}
                                      </span>
                                    </div>
                                    <p className="font-mono text-[9px] font-semibold text-slate-700 mt-1">
                                      {seat.admissionNo}
                                    </p>
                                    <p className="text-[9px] text-slate-600 truncate">{seat.studentName}</p>
                                  </>
                                ) : (
                                  <div className="text-center py-2 text-slate-300">Empty</div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: STUDENT SEATING LIST */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between">
                <span>Student Wise Seating Allocations</span>
                <span>
                  Total: {existingArrangement.manualAllocations.length + existingArrangement.onlineAllocations.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Admission No</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Class</th>
                      <th className="py-2.5 px-4">Room</th>
                      <th className="py-2.5 px-4">Seat / Slot ID</th>
                      <th className="py-2.5 px-4">Exam Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {existingArrangement.manualAllocations.map((alloc, idx) => (
                      <tr key={`m-${idx}`} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{alloc.admissionNo}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{alloc.studentName}</td>
                        <td className="py-2.5 px-4">{alloc.className}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{alloc.roomName}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">{alloc.seatId}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Manual
                          </span>
                        </td>
                      </tr>
                    ))}

                    {existingArrangement.onlineAllocations.map((alloc, idx) => (
                      <tr key={`o-${idx}`} className="hover:bg-cyan-50/50">
                        <td className="py-2.5 px-4 font-mono text-slate-400">
                          {existingArrangement.manualAllocations.length + idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{alloc.admissionNo}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{alloc.studentName}</td>
                        <td className="py-2.5 px-4">{alloc.className}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{alloc.roomName}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-cyan-700">{alloc.slotName}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-100 text-cyan-800">
                            Online
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NO SEATING GENERATED YET STATE */}
      {viewStage === 'none' && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Seating Generated Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Select an exam session above and click <strong>"Run Allocation"</strong> to generate class layout pattern diagrams with custom colors and editable seat assignments.
          </p>
        </div>
      )}
    </div>
  );
};
