import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ExamSession, Category, ClassItem, SeatingArrangement } from '../types';

const BOARD_NAME = 'Noorul Huda Examination Board';

export const computeBalancedPageChunks = (totalClassesCount: number): number[] => {
  if (totalClassesCount <= 0) return [];
  if (totalClassesCount <= 3) return [totalClassesCount];
  const totalPages = Math.ceil(totalClassesCount / 3);
  const chunks = new Array(totalPages).fill(Math.floor(totalClassesCount / totalPages));
  let remainder = totalClassesCount % totalPages;
  for (let i = 0; i < remainder; i++) chunks[i]++;
  return chunks;
};

export const exportSeatingToExcel = (session: ExamSession, arrangement: SeatingArrangement, allCategories: Category[]) => {
  const catMap = new Map<string, string>();
  allCategories.forEach((c) => catMap.set(c.id, c.name));
  const rows: any[] = [];
  arrangement.manualAllocations.forEach((alloc, idx) => rows.push({
    'S.No': idx + 1, 'Board Name': BOARD_NAME, Session: session.name, Date: session.date, Time: session.time,
    Category: catMap.get(alloc.categoryId) || 'Unknown', Class: alloc.className, 'Admission No': alloc.admissionNo,
    'Student Name': alloc.studentName, Room: alloc.roomName, Side: alloc.sideName || '', 'Seat ID': alloc.seatId, Mode: 'Manual',
  }));
  arrangement.onlineAllocations.forEach((alloc, idx) => rows.push({
    'S.No': arrangement.manualAllocations.length + idx + 1, 'Board Name': BOARD_NAME, Session: session.name,
    Date: session.date, Time: session.time, Category: catMap.get(alloc.categoryId) || 'Unknown', Class: alloc.className,
    'Admission No': alloc.admissionNo, 'Student Name': alloc.studentName, Room: alloc.roomName, Side: '',
    'Seat ID': alloc.slotName, Mode: 'Online',
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seating Arrangement');
  XLSX.writeFile(workbook, `${BOARD_NAME.replace(/\s+/g, '_')}_Seating_${session.name.replace(/\s+/g, '_')}.xlsx`);
};

export const exportSeatingToCSV = (session: ExamSession, arrangement: SeatingArrangement, allCategories: Category[]) => {
  const catMap = new Map<string, string>();
  allCategories.forEach((c) => catMap.set(c.id, c.name));
  const headers = ['S.No','Board Name','Session','Date','Time','Category','Class','Admission No','Student Name','Room','Side','Seat ID','Mode'];
  const csvRows: string[] = [headers.join(',')];
  arrangement.manualAllocations.forEach((alloc, idx) => csvRows.push([
    idx + 1, `"${BOARD_NAME}"`, `"${session.name}"`, session.date, `"${session.time}"`,
    `"${catMap.get(alloc.categoryId) || 'Unknown'}"`, `"${alloc.className}"`, `"${alloc.admissionNo}"`,
    `"${alloc.studentName}"`, `"${alloc.roomName}"`, `"${alloc.sideName || ''}"`, `"${alloc.seatId}"`, 'Manual'
  ].join(',')));
  arrangement.onlineAllocations.forEach((alloc, idx) => csvRows.push([
    arrangement.manualAllocations.length + idx + 1, `"${BOARD_NAME}"`, `"${session.name}"`, session.date,
    `"${session.time}"`, `"${catMap.get(alloc.categoryId) || 'Unknown'}"`, `"${alloc.className}"`,
    `"${alloc.admissionNo}"`, `"${alloc.studentName}"`, `"${alloc.roomName}"`, '', `"${alloc.slotName}"`, 'Online'
  ].join(',')));
  const link = document.createElement('a');
  link.href = encodeURI('data:text/csv;charset=utf-8,' + csvRows.join('\n'));
  link.download = `${BOARD_NAME.replace(/\s+/g, '_')}_Seating_${session.name.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

export const generateStudentWiseSeatingPDF = (
  session: ExamSession, arrangement: SeatingArrangement, allCategories: Category[], allClasses: ClassItem[]
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const catMap = new Map<string, Category>();
  allCategories.forEach((c) => catMap.set(c.id, c));
  const allAllocations = [
    ...arrangement.manualAllocations.map((a) => ({ ...a, seatId: `${a.roomName}-${a.seatId}` })),
    ...arrangement.onlineAllocations.map((a) => ({ ...a, seatId: `${a.roomName}-${a.slotName}` })),
  ];
  const categoryGroupMap = new Map<string, any[]>();
  allAllocations.forEach((alloc) => {
    if (!categoryGroupMap.has(alloc.categoryId)) categoryGroupMap.set(alloc.categoryId, []);
    categoryGroupMap.get(alloc.categoryId)!.push(alloc);
  });
  let isFirstCategory = true;
  categoryGroupMap.forEach((catAllocations, categoryId) => {
    if (!isFirstCategory) doc.addPage();
    isFirstCategory = false;
    const categoryName = catMap.get(categoryId)?.name || 'Category';
    const classGroupMap = new Map<string, any[]>();
    catAllocations.forEach((alloc) => {
      if (!classGroupMap.has(alloc.className)) classGroupMap.set(alloc.className, []);
      classGroupMap.get(alloc.className)!.push(alloc);
    });
    const classNames = Array.from(classGroupMap.keys()).sort();
    const pageChunks = computeBalancedPageChunks(classNames.length);
    let classIndex = 0;
    pageChunks.forEach((chunkSize, pageIdx) => {
      if (pageIdx > 0) doc.addPage();
      doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(20,30,55);
      doc.text(BOARD_NAME,105,12,{align:'center'});
      doc.setFontSize(10); doc.setFont('helvetica','normal');
      doc.text(`Student Wise Seating List — ${categoryName}`,105,18,{align:'center'});
      doc.setFontSize(9); doc.setTextColor(70,80,95);
      doc.text(`Session: ${session.name} | Date: ${session.date} | Time: ${session.time}`,105,23,{align:'center'});
      doc.setLineWidth(0.4); doc.setDrawColor(200,205,215); doc.line(14,26,196,26);
      let currentY = 30;
      for (let c=0;c<chunkSize;c++) {
        if (classIndex>=classNames.length) break;
        const className=classNames[classIndex];
        const studentList=classGroupMap.get(className)||[];
        studentList.sort((a,b)=>a.admissionNo.localeCompare(b.admissionNo));
        doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(15,23,42);
        doc.text(`Class: ${className} (Total: ${studentList.length} Students)`,14,currentY);
        autoTable(doc,{startY:currentY+3,head:[['S.No','Admission No','Student Name','Seat Allocation']],body:studentList.map((st,idx)=>[idx+1,st.admissionNo,st.studentName,st.seatId]),theme:'striped',headStyles:{fillColor:[30,41,59],textColor:[255,255,255],fontSize:8.5,fontStyle:'bold'},bodyStyles:{fontSize:8,textColor:[30,41,59]},columnStyles:{0:{cellWidth:15,halign:'center'},1:{cellWidth:40},2:{cellWidth:80},3:{cellWidth:45,fontStyle:'bold'}},margin:{left:14,right:14}});
        currentY=(doc as any).lastAutoTable.finalY+8;
        classIndex++;
      }
    });
  });
  doc.save(`${BOARD_NAME.replace(/\s+/g,'_')}_StudentList_${session.name.replace(/\s+/g,'_')}.pdf`);
};

// --- DOWNLOAD ROOM DIAGRAM PDF ---
// A4 portrait, exactly 3 compact rooms per page.
export const generateRoomDiagramPDF = (session: ExamSession, arrangement: SeatingArrangement) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const diagrams = arrangement.roomDiagrams;
  if (!diagrams || diagrams.length === 0) {
    alert('No room diagrams available for this session.');
    return;
  }

  const PAGE_W = 210;
  const MARGIN_X = 7;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const HEADER_H = 18;
  const ROOM_H = 87;
  const GAP = 3;
  const ROOMS_PER_PAGE = 3;
  const totalPages = Math.ceil(diagrams.length / ROOMS_PER_PAGE);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage();
    doc.setTextColor(20,30,55);
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(BOARD_NAME, PAGE_W/2, 7, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
    doc.text(`Official Exam Room Layout Diagram — ${session.name}`, PAGE_W/2, 11, {align:'center'});
    doc.setFontSize(6.5); doc.setTextColor(70,80,95);
    doc.text(`Date: ${session.date} | Time: ${session.time} | Page ${pageIdx+1} of ${totalPages}`, PAGE_W/2, 15, {align:'center'});
    doc.setDrawColor(180,190,205); doc.setLineWidth(0.3); doc.line(MARGIN_X, HEADER_H, PAGE_W-MARGIN_X, HEADER_H);

    const pageDiagrams = diagrams.slice(pageIdx*ROOMS_PER_PAGE,(pageIdx+1)*ROOMS_PER_PAGE);
    pageDiagrams.forEach((roomDiag, rIdx) => {
      const startY = HEADER_H + 2 + rIdx * (ROOM_H + GAP);
      const boxX = MARGIN_X, boxY = startY, boxW = CONTENT_W, boxH = ROOM_H;
      const summaryW = 35;
      const summaryX = boxX + boxW - summaryW - 2;
      const diagramX = boxX + 2;
      const diagramW = summaryX - diagramX - 2;

      doc.setDrawColor(200,210,225); doc.setFillColor(250,252,255);
      doc.roundedRect(boxX,boxY,boxW,boxH,1.5,1.5,'FD');
      doc.setFont('helvetica','bold'); doc.setFontSize(7.2); doc.setTextColor(15,23,42);
      doc.text(`Room: ${roomDiag.roomName} | Category: ${roomDiag.categoryName}`, boxX+3, boxY+5);
      doc.setFont('helvetica','normal'); doc.setFontSize(6.2);
      doc.text(`Total Students: ${roomDiag.totalStudents}`, summaryX, boxY+5);

      // Summary is immediately beside the diagram with minimal empty space.
      doc.setDrawColor(220,226,235); doc.setFillColor(241,245,249);
      doc.roundedRect(summaryX,boxY+8,summaryW,boxH-10,1,1,'FD');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.2); doc.setTextColor(30,41,59);
      doc.text('Room Summary',summaryX+2,boxY+13);
      doc.setFont('helvetica','normal'); doc.setFontSize(5.5);
      let sumY=boxY+17;
      (roomDiag.classSummary || []).forEach((cs:any)=>{
        if(sumY < boxY+boxH-7){ doc.text(`${cs.className}: ${cs.count}`,summaryX+2,sumY); sumY+=3.2; }
      });
      doc.setFont('helvetica','bold'); doc.text(`Total: ${roomDiag.totalStudents}`,summaryX+2,boxY+boxH-3.5);

      const sideGap = 3;
      const usableW = diagramW - sideGap;
      const sideCount = Math.max(roomDiag.sides.length,1);
      const sideW = usableW / sideCount;
      const gridTopY = boxY + 15;
      const availableH = boxH - 18;

      roomDiag.sides.forEach((side:any, sIdx:number) => {
        const sx = diagramX + sIdx * (sideW + (sIdx > 0 ? sideGap : 0));
        const innerW = sideW - (sIdx < sideCount-1 ? sideGap : 0);
        doc.setFont('helvetica','bold'); doc.setFontSize(5.5); doc.setTextColor(71,85,105);
        doc.text(side.sideName, sx, boxY+12);
        const rows=Math.max(side.rows||1,1), cols=Math.max(side.cols||1,1);
        const seatGapX=0.7, seatGapY=0.8;
        const seatW=Math.max(5.5,Math.min(10.5,(innerW-(cols-1)*seatGapX)/cols));
        const seatH=Math.max(6.5,Math.min(10,(availableH-(rows-1)*seatGapY)/rows));
        for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
          const seatX=sx+c*(seatW+seatGapX), seatY=gridTopY+r*(seatH+seatGapY), alloc=side.grid?.[r]?.[c];
          doc.setDrawColor(205,214,226); doc.setFillColor(alloc?[238,242,255]:[248,250,252]);
          doc.roundedRect(seatX,seatY,seatW,seatH,0.6,0.6,'FD');
          if(alloc){
            doc.setTextColor(30,58,138); doc.setFont('helvetica','bold'); doc.setFontSize(3.7);
            doc.text(`${alloc.seatId} | ${alloc.admissionNo}`,seatX+0.6,seatY+2.5,{maxWidth:seatW-1.2});
            doc.setTextColor(51,65,85); doc.setFont('helvetica','normal'); doc.setFontSize(3.5);
            const name=String(alloc.studentName||''); const cls=String(alloc.className||'');
            doc.text(name.length>15?name.slice(0,14)+'…':name,seatX+0.6,seatY+5,{maxWidth:seatW-1.2});
            doc.setFontSize(3.2); doc.text(cls.length>10?cls.slice(0,9)+'…':cls,seatX+0.6,seatY+7.2,{maxWidth:seatW-1.2});
          } else {
            doc.setTextColor(150,160,175); doc.setFont('helvetica','normal'); doc.setFontSize(3.5); doc.text('Empty',seatX+0.7,seatY+4.5);
          }
        }
        if(sIdx<sideCount-1){
          doc.setDrawColor(205,213,225); doc.setLineDashPattern([0.8,0.8],0);
          const aisleX=sx+innerW+sideGap/2; doc.line(aisleX,boxY+11,aisleX,boxY+boxH-3); doc.setLineDashPattern([],0);
        }
      });
    });
  }
  doc.save(`${BOARD_NAME.replace(/\s+/g,'_')}_RoomDiagrams_${session.name.replace(/\s+/g,'_')}.pdf`);
};
