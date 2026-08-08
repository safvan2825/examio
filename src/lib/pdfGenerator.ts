import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  ExamSession,
  Category,
  ClassItem,
  SeatingArrangement,
  RoomDiagramData,
  SeatAllocation,
  OnlineAllocation,
} from '../types';

const BOARD_NAME = 'Noorul Huda Examination Board';

// Helper to compute page balancing for classes in a category
// Rule: max 3 classes per page, auto balance (e.g. 7 classes -> [3, 2, 2], not [3, 3, 1])
export const computeBalancedPageChunks = (totalClassesCount: number): number[] => {
  if (totalClassesCount <= 0) return [];
  if (totalClassesCount <= 3) return [totalClassesCount];

  const totalPages = Math.ceil(totalClassesCount / 3);
  const chunks = new Array(totalPages).fill(Math.floor(totalClassesCount / totalPages));
  let remainder = totalClassesCount % totalPages;

  for (let i = 0; i < remainder; i++) {
    chunks[i]++;
  }
  return chunks;
};

// --- EXPORT TO EXCEL ---
export const exportSeatingToExcel = (
  session: ExamSession,
  arrangement: SeatingArrangement,
  allCategories: Category[]
) => {
  const catMap = new Map<string, string>();
  allCategories.forEach((c) => catMap.set(c.id, c.name));

  const rows: any[] = [];

  // Manual Allocations
  arrangement.manualAllocations.forEach((alloc, idx) => {
    rows.push({
      'S.No': idx + 1,
      'Board Name': BOARD_NAME,
      Session: session.name,
      Date: session.date,
      Time: session.time,
      Category: catMap.get(alloc.categoryId) || 'Unknown',
      Class: alloc.className,
      'Admission No': alloc.admissionNo,
      'Student Name': alloc.studentName,
      Room: alloc.roomName,
      Side: alloc.sideName || '',
      'Seat ID': alloc.seatId,
      Mode: 'Manual',
    });
  });

  // Online Allocations
  arrangement.onlineAllocations.forEach((alloc, idx) => {
    rows.push({
      'S.No': arrangement.manualAllocations.length + idx + 1,
      'Board Name': BOARD_NAME,
      Session: session.name,
      Date: session.date,
      Time: session.time,
      Category: catMap.get(alloc.categoryId) || 'Unknown',
      Class: alloc.className,
      'Admission No': alloc.admissionNo,
      'Student Name': alloc.studentName,
      Room: alloc.roomName,
      Side: '',
      'Seat ID': alloc.slotName,
      Mode: 'Online',
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seating Arrangement');

  XLSX.writeFile(
    workbook,
    `${BOARD_NAME.replace(/\s+/g, '_')}_Seating_${session.name.replace(/\s+/g, '_')}.xlsx`
  );
};

// --- EXPORT TO CSV ---
export const exportSeatingToCSV = (
  session: ExamSession,
  arrangement: SeatingArrangement,
  allCategories: Category[]
) => {
  const catMap = new Map<string, string>();
  allCategories.forEach((c) => catMap.set(c.id, c.name));

  const headers = [
    'S.No',
    'Board Name',
    'Session',
    'Date',
    'Time',
    'Category',
    'Class',
    'Admission No',
    'Student Name',
    'Room',
    'Side',
    'Seat ID',
    'Mode',
  ];

  const csvRows: string[] = [headers.join(',')];

  arrangement.manualAllocations.forEach((alloc, idx) => {
    csvRows.push(
      [
        idx + 1,
        `"${BOARD_NAME}"`,
        `"${session.name}"`,
        session.date,
        `"${session.time}"`,
        `"${catMap.get(alloc.categoryId) || 'Unknown'}"`,
        `"${alloc.className}"`,
        `"${alloc.admissionNo}"`,
        `"${alloc.studentName}"`,
        `"${alloc.roomName}"`,
        `"${alloc.sideName || ''}"`,
        `"${alloc.seatId}"`,
        'Manual',
      ].join(',')
    );
  });

  arrangement.onlineAllocations.forEach((alloc, idx) => {
    csvRows.push(
      [
        arrangement.manualAllocations.length + idx + 1,
        `"${BOARD_NAME}"`,
        `"${session.name}"`,
        session.date,
        `"${session.time}"`,
        `"${catMap.get(alloc.categoryId) || 'Unknown'}"`,
        `"${alloc.className}"`,
        `"${alloc.admissionNo}"`,
        `"${alloc.studentName}"`,
        `"${alloc.roomName}"`,
        '',
        `"${alloc.slotName}"`,
        'Online',
      ].join(',')
    );
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `${BOARD_NAME.replace(/\s+/g, '_')}_Seating_${session.name.replace(/\s+/g, '_')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- DOWNLOAD STUDENT WISE SEATING LIST PDF ---
export const generateStudentWiseSeatingPDF = (
  session: ExamSession,
  arrangement: SeatingArrangement,
  allCategories: Category[],
  allClasses: ClassItem[]
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const catMap = new Map<string, Category>();
  allCategories.forEach((c) => catMap.set(c.id, c));

  const classMap = new Map<string, ClassItem>();
  allClasses.forEach((c) => classMap.set(c.id, c));

  // Combine manual & online allocations
  const allAllocations: {
    studentId: string;
    admissionNo: string;
    studentName: string;
    classId: string;
    className: string;
    categoryId: string;
    roomName: string;
    seatId: string;
  }[] = [
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

  // Group allocations by Category
  const categoryGroupMap = new Map<string, typeof allAllocations>();
  allAllocations.forEach((alloc) => {
    if (!categoryGroupMap.has(alloc.categoryId)) {
      categoryGroupMap.set(alloc.categoryId, []);
    }
    categoryGroupMap.get(alloc.categoryId)!.push(alloc);
  });

  let isFirstCategory = true;

  categoryGroupMap.forEach((catAllocations, categoryId) => {
    const categoryObj = catMap.get(categoryId);
    const categoryName = categoryObj ? categoryObj.name : 'Category';

    if (!isFirstCategory) {
      doc.addPage();
    }
    isFirstCategory = false;

    // Group class wise in this category
    const classGroupMap = new Map<string, typeof allAllocations>();
    catAllocations.forEach((alloc) => {
      if (!classGroupMap.has(alloc.className)) {
        classGroupMap.set(alloc.className, []);
      }
      classGroupMap.get(alloc.className)!.push(alloc);
    });

    const classNames = Array.from(classGroupMap.keys()).sort();
    const pageChunks = computeBalancedPageChunks(classNames.length);

    let classIndex = 0;

    pageChunks.forEach((chunkSize, pageIdx) => {
      if (pageIdx > 0) {
        doc.addPage();
      }

      // Page Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 30, 55);
      doc.text(BOARD_NAME, 105, 12, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Student Wise Seating List — ${categoryName}`, 105, 18, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(70, 80, 95);
      doc.text(`Session: ${session.name} | Date: ${session.date} | Time: ${session.time}`, 105, 23, {
        align: 'center',
      });
      doc.setLineWidth(0.4);
      doc.setDrawColor(200, 205, 215);
      doc.line(14, 26, 196, 26);

      let currentY = 30;

      // Render classes on this page (max 3 per page)
      for (let c = 0; c < chunkSize; c++) {
        if (classIndex >= classNames.length) break;
        const className = classNames[classIndex];
        const studentList = classGroupMap.get(className) || [];
        studentList.sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));

        // Class Heading
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`Class: ${className} (Total: ${studentList.length} Students)`, 14, currentY);

        // AutoTable for student list
        const tableBody = studentList.map((st, idx) => [
          idx + 1,
          st.admissionNo,
          st.studentName,
          st.seatId,
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['S.No', 'Admission No', 'Student Name', 'Seat Allocation']],
          body: tableBody,
          theme: 'striped',
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 8.5,
            fontStyle: 'bold',
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
          },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 80 },
            3: { cellWidth: 45, fontStyle: 'bold' },
          },
          margin: { left: 14, right: 14 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
        classIndex++;
      }
    });
  });

  doc.save(`${BOARD_NAME.replace(/\s+/g, '_')}_StudentList_${session.name.replace(/\s+/g, '_')}.pdf`);
};

// --- DOWNLOAD ROOM DIAGRAM PDF ---
// Format: A4 Landscape, 3 rooms per page
export const generateRoomDiagramPDF = (
  session: ExamSession,
  arrangement: SeatingArrangement
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const diagrams = arrangement.roomDiagrams;

  if (!diagrams || diagrams.length === 0) {
    alert('No room diagrams available for this session.');
    return;
  }

  // Exactly 3 rooms per page
  const roomsPerPage = 3;
  const totalPages = Math.ceil(diagrams.length / roomsPerPage);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage();

    // Page Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 30, 55);
    doc.text(BOARD_NAME, 148, 10, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Official Exam Room Layout Diagram — ${session.name}`, 148, 15, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setTextColor(70, 80, 95);
    doc.text(`Date: ${session.date} | Time: ${session.time} | Page ${pageIdx + 1} of ${totalPages}`, 148, 19, {
      align: 'center',
    });

    doc.setLineWidth(0.4);
    doc.setDrawColor(180, 190, 205);
    doc.line(10, 21, 287, 21);

    const pageDiagrams = diagrams.slice(pageIdx * roomsPerPage, (pageIdx + 1) * roomsPerPage);
    let startY = 24;

    pageDiagrams.forEach((roomDiag, rIdx) => {
      // Draw Room Box Outer
      const boxWidth = 277;
      const boxHeight = 56;
      doc.setDrawColor(200, 210, 225);
      doc.setFillColor(250, 252, 255);
      doc.roundedRect(10, startY, boxWidth, boxHeight, 2, 2, 'FD');

      // Room Sub-Header Line
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Room: ${roomDiag.roomName}  |  Category: ${roomDiag.categoryName}  |  Total Students: ${roomDiag.totalStudents}`,
        14,
        startY + 6
      );

      // Room Summary Box on the right
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(225, startY + 2, 60, boxHeight - 4, 1.5, 1.5, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Room Summary', 230, startY + 7);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      let sumY = startY + 12;

      roomDiag.classSummary.forEach((cs) => {
        if (sumY <= startY + boxHeight - 8) {
          doc.text(`${cs.className} — ${cs.count}`, 230, sumY);
          sumY += 4;
        }
      });
      doc.setFont('helvetica', 'bold');
      doc.text(`Total — ${roomDiag.totalStudents}`, 230, startY + boxHeight - 4);

      // Room Grid Layout
      doc.setFontSize(7);
      let sideStartX = 14;

      roomDiag.sides.forEach((side, sIdx) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(side.sideName, sideStartX, startY + 12);

        // Grid seats
        const maxCols = side.cols;
        const maxRows = side.rows;
        const seatW = Math.min(18, Math.floor(190 / (side.cols * roomDiag.sides.length)));
        const seatH = Math.min(6, Math.floor(36 / Math.max(maxRows, 1)));

        let gridTopY = startY + 14;

        for (let r = 0; r < maxRows; r++) {
          for (let c = 0; c < maxCols; c++) {
            const seatX = sideStartX + c * (seatW + 1);
            const seatY = gridTopY + r * (seatH + 1);

            const alloc = side.grid[r][c];

            doc.setDrawColor(210, 218, 228);
            if (alloc) {
              doc.setFillColor(238, 242, 255); // Indigo light
              doc.rect(seatX, seatY, seatW, seatH, 'FD');

              doc.setFontSize(5.5);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(30, 58, 138);
              doc.text(`${alloc.seatId}: ${alloc.admissionNo}`, seatX + 1, seatY + 2.5);

              doc.setFontSize(5);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(51, 65, 85);
              const nameTrunc = alloc.studentName.length > 10 ? alloc.studentName.substring(0, 9) + '.' : alloc.studentName;
              doc.text(`${nameTrunc} (${alloc.className})`, seatX + 1, seatY + 5);
            } else {
              doc.setFillColor(248, 250, 252);
              doc.rect(seatX, seatY, seatW, seatH, 'FD');
              doc.setFontSize(5.5);
              doc.setTextColor(160, 170, 185);
              doc.text('Empty', seatX + 1, seatY + 4);
            }
          }
        }

        sideStartX += side.cols * (seatW + 1) + 8; // aisle gap
        if (sIdx < roomDiag.sides.length - 1) {
          // Draw Aisle line
          doc.setDrawColor(203, 213, 225);
          doc.setLineDashPattern([1, 1], 0);
          doc.line(sideStartX - 4, startY + 12, sideStartX - 4, startY + boxHeight - 4);
          doc.setLineDashPattern([], 0);
        }
      });

      startY += boxHeight + 4;
    });
  }

  doc.save(`${BOARD_NAME.replace(/\s+/g, '_')}_RoomDiagrams_${session.name.replace(/\s+/g, '_')}.pdf`);
};
