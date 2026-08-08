import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import {
  ExamSession,
  Category,
  ClassItem,
  SeatingArrangement,
} from '../types';
import { computeBalancedPageChunks } from '../lib/pdfGenerator';

const BOARD_NAME = 'Noorul Huda Examination Board';

interface PrintModalViewProps {
  type: 'roomDiagram' | 'studentList';
  session: ExamSession;
  arrangement: SeatingArrangement;
  categories: Category[];
  classes: ClassItem[];
  onClose: () => void;
}

export const PrintModalView: React.FC<PrintModalViewProps> = ({
  type,
  session,
  arrangement,
  categories,
  classes,
  onClose,
}) => {
  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  const triggerPrint = () => {
    window.print();
  };

  // Prepare Student Wise Seating List Data
  const allAllocations = [
    ...arrangement.manualAllocations.map((a) => ({
      studentId: a.studentId,
      admissionNo: a.admissionNo,
      studentName: a.studentName,
      classId: a.classId,
      className: a.className,
      categoryId: a.categoryId,
      roomName: a.roomName,
      seatId: `${a.roomName}-${a.seatId}`,
    })),
    ...arrangement.onlineAllocations.map((a) => ({
      studentId: a.studentId,
      admissionNo: a.admissionNo,
      studentName: a.studentName,
      classId: a.classId,
      className: a.className,
      categoryId: a.categoryId,
      roomName: a.roomName,
      seatId: `${a.roomName}-${a.slotName}`,
    })),
  ];

  // Group by category
  const categoryGroupMap = new Map<string, typeof allAllocations>();
  allAllocations.forEach((alloc) => {
    if (!categoryGroupMap.has(alloc.categoryId)) {
      categoryGroupMap.set(alloc.categoryId, []);
    }
    categoryGroupMap.get(alloc.categoryId)!.push(alloc);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
      {/* Top Floating Print Controls (Hidden on Print) */}
      <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between w-full max-w-5xl mb-4 print:hidden shrink-0">
        <div>
          <h3 className="text-sm font-bold">
            Print Preview — {type === 'roomDiagram' ? 'Room Diagram PDF' : 'Student Wise Seating List'}
          </h3>
          <p className="text-xs text-slate-400">
            {type === 'roomDiagram'
              ? 'Formatted for A4 Landscape (3 rooms per page).'
              : 'Formatted for A4 Portrait with balanced pages & category isolation.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={triggerPrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report Now
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Paper Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex-1 overflow-y-auto p-8 print:p-0 print:border-none print:shadow-none print:overflow-visible">
        {/* Style injection for exact printable page breaks */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-area, #printable-area * {
              visibility: visible;
            }
            #printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: ${type === 'roomDiagram' ? 'A4 landscape' : 'A4 portrait'};
              margin: 8mm;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          }
        `}</style>

        <div id="printable-area" className="text-slate-900 space-y-8">
          {/* TYPE 1: ROOM DIAGRAM PRINT VIEW (3 rooms per page) */}
          {type === 'roomDiagram' && (
            <div>
              {Array.from({
                length: Math.ceil(arrangement.roomDiagrams.length / 3),
              }).map((_, pageIdx) => {
                const pageRooms = arrangement.roomDiagrams.slice(
                  pageIdx * 3,
                  (pageIdx + 1) * 3
                );

                return (
                  <div
                    key={pageIdx}
                    className="page-break space-y-6 pb-6 mb-8 border-b border-slate-200 print:border-none print:mb-0 print:pb-0"
                  >
                    {/* Header */}
                    <div className="text-center border-b border-slate-200 pb-3">
                      <h1 className="text-base font-bold text-slate-900">{BOARD_NAME}</h1>
                      <h2 className="text-xs font-bold text-slate-700">
                        Official Exam Room Layout Diagram
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Date: {session.date} | Time: {session.time} | Page {pageIdx + 1} of{' '}
                        {Math.ceil(arrangement.roomDiagrams.length / 3)}
                      </p>
                    </div>

                    {/* Rooms on this page */}
                    <div className="space-y-4">
                      {pageRooms.map((roomDiag) => (
                        <div
                          key={roomDiag.roomId}
                          className="border border-slate-300 rounded-xl p-4 bg-slate-50/30 flex justify-between gap-4"
                        >
                          <div className="flex-1 space-y-3">
                            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
                              <h3 className="text-xs font-bold text-slate-900">
                                Room: {roomDiag.roomName} (Category: {roomDiag.categoryName})
                              </h3>
                              <span className="text-[11px] font-semibold text-slate-600">
                                Total Students: {roomDiag.totalStudents}
                              </span>
                            </div>

                            {/* Sides */}
                            <div className="flex flex-wrap gap-4">
                              {roomDiag.sides.map((side) => (
                                <div key={side.sideId} className="bg-white p-2 rounded border border-slate-200">
                                  <p className="text-[10px] font-bold text-slate-600 mb-1">
                                    {side.sideName}
                                  </p>
                                  <div
                                    className="grid gap-1"
                                    style={{
                                      gridTemplateColumns: `repeat(${side.cols}, minmax(0, 1fr))`,
                                    }}
                                  >
                                    {side.grid.map((row, r) =>
                                      row.map((seat, c) => (
                                        <div
                                          key={`${r}-${c}`}
                                          className="w-16 h-8 border border-slate-200 rounded p-1 text-[8px] flex flex-col justify-between"
                                        >
                                          {seat ? (
                                            <>
                                              <div className="flex justify-between font-bold text-indigo-900">
                                                <span>{seat.seatId}</span>
                                                <span>{seat.className}</span>
                                              </div>
                                              <div className="font-mono text-slate-700 truncate">
                                                {seat.admissionNo}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-slate-300">Empty</span>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right Side Summary Box */}
                          <div className="w-44 bg-slate-100 p-3 rounded-lg border border-slate-200 text-xs shrink-0">
                            <h4 className="font-bold text-slate-800 border-b border-slate-300 pb-1 mb-2">
                              Room Summary
                            </h4>
                            <div className="space-y-1 text-[11px] text-slate-700">
                              {roomDiag.classSummary.map((cs) => (
                                <div key={cs.className} className="flex justify-between">
                                  <span>{cs.className}:</span>
                                  <span className="font-bold">{cs.count}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-300 mt-3 pt-1 text-xs font-bold text-slate-900 flex justify-between">
                              <span>Total:</span>
                              <span>{roomDiag.totalStudents}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TYPE 2: STUDENT WISE SEATING LIST VIEW */}
          {type === 'studentList' && (
            <div>
              {Array.from(categoryGroupMap.entries()).map(
                ([catId, catAllocations], catIdx) => {
                  const categoryObj = catMap.get(catId);
                  const categoryName = categoryObj ? categoryObj.name : 'Category';

                  // Group by class
                  const classGroupMap = new Map<string, typeof catAllocations>();
                  catAllocations.forEach((alloc) => {
                    if (!classGroupMap.has(alloc.className)) {
                      classGroupMap.set(alloc.className, []);
                    }
                    classGroupMap.get(alloc.className)!.push(alloc);
                  });

                  const classNames = Array.from(classGroupMap.keys()).sort();
                  const pageChunks = computeBalancedPageChunks(classNames.length);

                  let classIdx = 0;

                  return (
                    <div key={catId}>
                      {pageChunks.map((chunkSize, pIdx) => {
                        const pageClasses = classNames.slice(classIdx, classIdx + chunkSize);
                        classIdx += chunkSize;

                        return (
                          <div
                            key={pIdx}
                            className="page-break space-y-6 pb-6 mb-8 border-b border-slate-200 print:border-none print:mb-0 print:pb-0"
                          >
                            {/* Header */}
                            <div className="text-center border-b border-slate-200 pb-3">
                              <h1 className="text-base font-bold text-slate-900">{BOARD_NAME}</h1>
                              <h2 className="text-xs font-bold text-slate-700">
                                Student Wise Seating List — {categoryName}
                              </h2>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Date: {session.date} | Time: {session.time}
                              </p>
                            </div>

                            {/* Classes on this page */}
                            <div className="space-y-6">
                              {pageClasses.map((clsName) => {
                                const stList = classGroupMap.get(clsName) || [];
                                stList.sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));

                                return (
                                  <div key={clsName} className="space-y-2">
                                    <h3 className="text-xs font-bold text-slate-900 bg-slate-100 p-2 rounded-lg border border-slate-200 flex justify-between">
                                      <span>Class: {clsName}</span>
                                      <span>Total: {stList.length} Students</span>
                                    </h3>

                                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                                      <thead className="bg-slate-800 text-white font-semibold text-[10px]">
                                        <tr>
                                          <th className="py-1.5 px-3">S.No</th>
                                          <th className="py-1.5 px-3">Admission No</th>
                                          <th className="py-1.5 px-3">Student Name</th>
                                          <th className="py-1.5 px-3">Seat ID</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {stList.map((st, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-3 font-mono text-slate-400">
                                              {idx + 1}
                                            </td>
                                            <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                                              {st.admissionNo}
                                            </td>
                                            <td className="py-1.5 px-3 font-medium text-slate-800">
                                              {st.studentName}
                                            </td>
                                            <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">
                                              {st.seatId}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
