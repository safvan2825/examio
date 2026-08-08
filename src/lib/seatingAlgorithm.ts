import {
  Category,
  ClassItem,
  Student,
  Room,
  ExamSession,
  SeatAllocation,
  OnlineAllocation,
  RoomDiagramData,
  ClassRoomDiagram,
  SeatingArrangement,
  RoomClassSummary,
} from '../types';

export interface SeatingGenerationResult {
  arrangement: SeatingArrangement;
  warnings: string[];
  summary: {
    totalStudents: number;
    totalManualStudents: number;
    totalOnlineStudents: number;
    manualCapacityAvailable: number;
    onlineCapacityAvailable: number;
    requiredRoomsCount: number;
  };
}

// Convert column index to Letter (0 -> A, 1 -> B, 2 -> C, ...)
const getColumnLetter = (index: number): string => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Compute the total seat capacity of a manual room
const roomCapacity = (room: Room): number => {
  let cap = 0;
  room.sides?.forEach((s) => (cap += s.cols * s.rows));
  return cap;
};

// Prohibited-adjacency check: same class in adjacent columns (c-1, c+1) within the
// row range [r-1, r+1] on the same side. Works for both class-ID grids (string)
// and student grids (SeatAllocation with classId).
const hasAdjacentClassConflict = (
  grid: ReadonlyArray<ReadonlyArray<string | { classId?: string } | null>>,
  rows: number,
  cols: number,
  candidateClassId: string,
  r: number,
  c: number
): boolean => {
  const cellClassId = (cell: string | { classId?: string } | null): string | null => {
    if (cell === null || cell === undefined) return null;
    return typeof cell === 'string' ? cell : (cell.classId ?? null);
  };

  // Check left column (c - 1) on same side
  if (c > 0) {
    for (let adjR = Math.max(0, r - 1); adjR <= Math.min(rows - 1, r + 1); adjR++) {
      if (cellClassId(grid[adjR][c - 1]) === candidateClassId) return true;
    }
  }

  // Check right column (c + 1) on same side
  if (c < cols - 1) {
    for (let adjR = Math.max(0, r - 1); adjR <= Math.min(rows - 1, r + 1); adjR++) {
      if (cellClassId(grid[adjR][c + 1]) === candidateClassId) return true;
    }
  }

  return false;
};

// Distribute `total` seats across rooms as evenly as possible (differ by at most 1),
// never exceeding any room's capacity. This also spreads vacant seats evenly.
const computeEvenRoomTargets = (total: number, capacities: number[]): number[] => {
  const n = capacities.length;
  const targets = new Array(n).fill(0);
  let remaining = total;
  let idx = 0;
  while (remaining > 0) {
    let placed = false;
    for (let i = 0; i < n && remaining > 0; i++) {
      const roomIdx = (idx + i) % n;
      if (targets[roomIdx] < capacities[roomIdx]) {
        targets[roomIdx]++;
        remaining--;
        placed = true;
      }
    }
    if (!placed) break; // all rooms full
    idx = (idx + 1) % n;
  }
  return targets;
};

interface CategorySeatingPlan {
  allocatedRooms: Room[];
  classIds: string[];
  quotas: number[][]; // [roomIdx][classIdx] — students of class classIdx to seat in room roomIdx
  roomTargets: number[];
}

// Build a balanced allocation plan for one category:
//  - Room totals are as even as possible (differ by at most 1), capped by capacity,
//    which also distributes vacant seats evenly across all rooms.
//  - Every class is spread across every room as evenly as possible (per-class diff <= 1).
const computeCategoryPlan = (
  catStudents: Student[],
  catClassIds: string[],
  catAllocatedRooms: Room[]
): CategorySeatingPlan => {
  // Ignore rooms with no seatable capacity (e.g. rooms without sides) so they
  // cannot silently absorb quota that would never be filled.
  const allocatedRooms = catAllocatedRooms.filter((r) => roomCapacity(r) > 0);
  const nRooms = allocatedRooms.length;
  const classCounts = catClassIds.map(
    (cid) => catStudents.filter((s) => s.classId === cid).length
  );
  const roomCapacities = catAllocatedRooms.map(roomCapacity);
  const roomTargets = computeEvenRoomTargets(catStudents.length, roomCapacities);

  const quotas: number[][] = Array.from({ length: nRooms }, () =>
    new Array(catClassIds.length).fill(0)
  );
  const roomAssigned = new Array(nRooms).fill(0);

  // Base share of every class goes into every room
  for (let cIdx = 0; cIdx < catClassIds.length; cIdx++) {
    const base = Math.floor(classCounts[cIdx] / nRooms);
    for (let rIdx = 0; rIdx < nRooms; rIdx++) {
      quotas[rIdx][cIdx] += base;
      roomAssigned[rIdx] += base;
    }
  }

  // Remainders: each class's leftover students go one-per-room into the rooms
  // that are furthest below their balanced target
  for (let cIdx = 0; cIdx < catClassIds.length; cIdx++) {
    let extra = classCounts[cIdx] % nRooms;
    if (extra === 0) continue;

    const roomOrder = Array.from({ length: nRooms }, (_, i) => i).sort(
      (a, b) =>
        roomTargets[b] - roomAssigned[b] - (roomTargets[a] - roomAssigned[a])
    );

    for (let e = 0; e < extra; e++) {
      const rIdx = roomOrder[e];
      if (roomTargets[rIdx] - roomAssigned[rIdx] > 0) {
        quotas[rIdx][cIdx]++;
        roomAssigned[rIdx]++;
      } else {
        // Fallback: seat into any room still below its target
        let fallbackIdx = -1;
        for (let i = 0; i < nRooms; i++) {
          if (roomTargets[i] - roomAssigned[i] > 0) {
            fallbackIdx = i;
            break;
          }
        }
        if (fallbackIdx === -1) break;
        quotas[fallbackIdx][cIdx]++;
        roomAssigned[fallbackIdx]++;
      }
    }
  }

  return {
    allocatedRooms,
    classIds: catClassIds,
    quotas,
    roomTargets,
  };
};

export const generateSeatingArrangement = (
  session: ExamSession,
  allStudents: Student[],
  allClasses: ClassItem[],
  allCategories: Category[],
  allRooms: Room[]
): SeatingGenerationResult => {
  const warnings: string[] = [];

  // Maps for fast lookup
  const classMap = new Map<string, ClassItem>();
  allClasses.forEach((c) => classMap.set(c.id, c));

  const categoryMap = new Map<string, Category>();
  allCategories.forEach((cat) => categoryMap.set(cat.id, cat));

  // Identify session class configurations
  const sessionManualClassIds = new Set<string>();
  const sessionOnlineClassIds = new Set<string>();

  session.classConfigs.forEach((cfg) => {
    if (cfg.examMode === 'Online') {
      sessionOnlineClassIds.add(cfg.classId);
    } else {
      sessionManualClassIds.add(cfg.classId);
    }
  });

  // Filter session students
  const manualStudents = allStudents.filter((st) =>
    sessionManualClassIds.has(st.classId)
  );
  const onlineStudents = allStudents.filter((st) =>
    sessionOnlineClassIds.has(st.classId)
  );

  const totalStudentsCount = manualStudents.length + onlineStudents.length;

  // Calculate capacities
  let manualCapacityAvailable = 0;
  let onlineCapacityAvailable = 0;

  // Determine active categories in manual session
  const manualCategoryIds = new Set<string>();
  sessionManualClassIds.forEach((clsId) => {
    const cls = classMap.get(clsId);
    if (cls) manualCategoryIds.add(cls.categoryId);
  });

  const availableManualRooms = allRooms.filter(
    (r) => r.examMode === 'Manual' && manualCategoryIds.has(r.categoryId)
  );

  availableManualRooms.forEach((r) => {
    let roomCap = 0;
    if (r.sides) {
      r.sides.forEach((side) => {
        roomCap += side.cols * side.rows;
      });
    }
    manualCapacityAvailable += roomCap;
  });

  const availableOnlineRooms = allRooms.filter((r) => r.examMode === 'Online');
  availableOnlineRooms.forEach((r) => {
    if (r.onlineCapacity) {
      const slotCount = r.onlineSlots?.length || 1;
      onlineCapacityAvailable += r.onlineCapacity * slotCount;
    }
  });

  // Estimate required rooms
  let requiredRoomsCount = 0;

  // --- ONLINE SEATING ALLOCATION ---
  const onlineAllocations: OnlineAllocation[] = [];
  if (onlineStudents.length > 0) {
    let currentOnlineStudentIndex = 0;

    for (const room of availableOnlineRooms) {
      if (currentOnlineStudentIndex >= onlineStudents.length) break;

      const slots = room.onlineSlots && room.onlineSlots.length > 0 ? room.onlineSlots : ['Slot 1'];
      const capPerSlot = Math.ceil((room.onlineCapacity || 30) / slots.length);

      // Distribute students alternately between slots
      let currentSlotIdx = 0;
      const slotCounts = new Array(slots.length).fill(0);

      while (
        currentOnlineStudentIndex < onlineStudents.length &&
        slotCounts.some((cnt) => cnt < capPerSlot)
      ) {
        // Find next slot that isn't full
        let attempts = 0;
        while (slotCounts[currentSlotIdx] >= capPerSlot && attempts < slots.length) {
          currentSlotIdx = (currentSlotIdx + 1) % slots.length;
          attempts++;
        }

        if (attempts >= slots.length) break; // room full across all slots

        const student = onlineStudents[currentOnlineStudentIndex];
        const cls = classMap.get(student.classId);
        const slotName = slots[currentSlotIdx];

        onlineAllocations.push({
          studentId: student.id,
          admissionNo: student.admissionNo,
          studentName: student.name,
          classId: student.classId,
          className: cls ? cls.name : 'Unknown',
          categoryId: cls ? cls.categoryId : 'Unknown',
          roomId: room.id,
          roomName: room.name,
          slotName: slotName,
        });

        slotCounts[currentSlotIdx]++;
        currentOnlineStudentIndex++;
        currentSlotIdx = (currentSlotIdx + 1) % slots.length;
      }
    }

    if (currentOnlineStudentIndex < onlineStudents.length) {
      warnings.push(
        `Warning: Online room capacity (${onlineCapacityAvailable}) is insufficient for ${onlineStudents.length} online students!`
      );
    }
  }

  // --- MANUAL SEATING ALLOCATION (PER CATEGORY ISOLATION) ---
  const manualAllocations: SeatAllocation[] = [];
  const roomDiagrams: RoomDiagramData[] = [];
  const roomSummariesList: SeatingArrangement['roomSummaries'] = [];

  // Group manual students by Category
  const categoryStudentsMap = new Map<string, Student[]>();
  manualStudents.forEach((st) => {
    const cls = classMap.get(st.classId);
    if (!cls) return;
    const catId = cls.categoryId;
    if (!categoryStudentsMap.has(catId)) {
      categoryStudentsMap.set(catId, []);
    }
    categoryStudentsMap.get(catId)!.push(st);
  });

  // Process each Category independently to ensure 100% strict Category Isolation!
  for (const catId of Array.from(manualCategoryIds)) {
    const catStudents = categoryStudentsMap.get(catId) || [];
    if (catStudents.length === 0) continue;

    const categoryObj = categoryMap.get(catId);
    const categoryName = categoryObj ? categoryObj.name : 'Category';

    // Find classes belonging to this category in session
    const catClassIds = Array.from(
      new Set(catStudents.map((st) => st.classId))
    );

    // Find rooms belonging ONLY to this category
    const catRooms = allRooms.filter(
      (r) => r.examMode === 'Manual' && r.categoryId === catId
    );

    if (catRooms.length === 0) {
      warnings.push(
        `Error: No manual rooms available for category "${categoryName}". ${catStudents.length} students unseated.`
      );
      continue;
    }

    // Rule: Use at least 1 room for every class in the category if available
    const minRoomsForClasses = Math.min(catClassIds.length, catRooms.length);

    // Calculate total capacity of selected rooms
    const catAllocatedRooms: Room[] = [];
    let cumulativeCapacity = 0;

    for (const r of catRooms) {
      const rCap = roomCapacity(r);
      catAllocatedRooms.push(r);
      cumulativeCapacity += rCap;

      if (
        catAllocatedRooms.length >= minRoomsForClasses &&
        cumulativeCapacity >= catStudents.length
      ) {
        break; // We have enough rooms
      }
    }

    requiredRoomsCount += catAllocatedRooms.length;

    if (cumulativeCapacity < catStudents.length) {
      warnings.push(
        `Warning: Capacity in category "${categoryName}" (${cumulativeCapacity}) is less than required students (${catStudents.length}).`
      );
    }

    // Build a balanced allocation plan:
    //  1. Room totals are as even as possible (differ by at most 1), respecting capacity.
    //  2. Every class is spread across every room as evenly as possible (per-class diff <= 1).
    const plan = computeCategoryPlan(catStudents, catClassIds, catAllocatedRooms);

    // Group students by Class for queued assignment
    const classQueuesMap = new Map<string, Student[]>();
    catClassIds.forEach((cId) => classQueuesMap.set(cId, []));
    catStudents.forEach((st) => classQueuesMap.get(st.classId)?.push(st));

    for (let rIndex = 0; rIndex < plan.allocatedRooms.length; rIndex++) {
      const room = plan.allocatedRooms[rIndex];
      if (!room.sides || room.sides.length === 0) continue;

      // Prepare Room Diagram structure
      const roomSidesData: RoomDiagramData['sides'] = room.sides.map((side) => {
        const grid: (SeatAllocation | null)[][] = Array.from(
          { length: side.rows },
          () => Array(side.cols).fill(null)
        );
        return {
          sideId: side.id,
          sideName: side.sideName,
          cols: side.cols,
          rows: side.rows,
          grid,
        };
      });

      const roomClassCountMap = new Map<string, number>();
      let roomStudentCount = 0;
      let classTurnIndex = 0;

      // Remaining seats to fill per class in THIS room (from the balanced plan)
      const roomQuota = plan.quotas[rIndex].slice();

      // Loop through seats across room sides
      // To optimize placement: fill row by row across sides or column by column
      for (const sideData of roomSidesData) {
        for (let r = 0; r < sideData.rows; r++) {
          for (let c = 0; c < sideData.cols; c++) {
            const roomRemaining = roomQuota.reduce((sum, q) => sum + q, 0);
            if (roomRemaining === 0) break; // Room reached its balanced share

            // Find a class with remaining quota in this room that does NOT violate adjacency
            let chosenClassIdx = -1;

            // Try candidate classes starting from classTurnIndex
            for (let attempt = 0; attempt < plan.classIds.length; attempt++) {
              const qIdx = (classTurnIndex + attempt) % plan.classIds.length;
              if (roomQuota[qIdx] <= 0) continue;

              const candidateClassId = plan.classIds[qIdx];

              // Check Adjacency Restriction for seat (c, r) in sideData
              if (
                !hasAdjacentClassConflict(
                  sideData.grid,
                  sideData.rows,
                  sideData.cols,
                  candidateClassId,
                  r,
                  c
                )
              ) {
                chosenClassIdx = qIdx;
                classTurnIndex = (qIdx + 1) % plan.classIds.length; // move turn
                break;
              }
            }

            // Fallback: if adjacency blocks every class, seat from the class with the most
            // remaining quota in this room to avoid unseated students
            if (chosenClassIdx === -1) {
              let maxQuota = -1;
              for (let i = 0; i < roomQuota.length; i++) {
                if (roomQuota[i] > maxQuota) {
                  maxQuota = roomQuota[i];
                  chosenClassIdx = i;
                }
              }
            }

            if (chosenClassIdx !== -1 && roomQuota[chosenClassIdx] > 0) {
              const chosenClassId = plan.classIds[chosenClassIdx];
              const queue = classQueuesMap.get(chosenClassId) || [];
              const student = queue.shift();

              if (student) {
                roomQuota[chosenClassIdx]--;

                const cls = classMap.get(student.classId);
                const colLetter = getColumnLetter(c);
                const seatId = `${colLetter}${r + 1}`; // e.g. A1, B2

                const allocation: SeatAllocation = {
                  studentId: student.id,
                  admissionNo: student.admissionNo,
                  studentName: student.name,
                  classId: student.classId,
                  className: cls ? cls.name : 'Unknown',
                  categoryId: catId,
                  roomId: room.id,
                  roomName: room.name,
                  sideId: sideData.sideId,
                  sideName: sideData.sideName,
                  seatId,
                  colIndex: c,
                  rowIndex: r,
                };

                sideData.grid[r][c] = allocation;
                manualAllocations.push(allocation);

                const currentClsCount = roomClassCountMap.get(allocation.className) || 0;
                roomClassCountMap.set(allocation.className, currentClsCount + 1);
                roomStudentCount++;
              }
            }
          }
        }
      }

      // Build Room Summary
      const classSummary: RoomClassSummary[] = [];
      const classCountsRecord: { [clsName: string]: number } = {};

      roomClassCountMap.forEach((cnt, cName) => {
        classSummary.push({ classId: '', className: cName, count: cnt });
        classCountsRecord[cName] = cnt;
      });
      classSummary.sort((a, b) => a.className.localeCompare(b.className));

      roomDiagrams.push({
        roomId: room.id,
        roomName: room.name,
        categoryId: catId,
        categoryName,
        totalStudents: roomStudentCount,
        sides: roomSidesData,
        classSummary,
      });

      roomSummariesList.push({
        roomId: room.id,
        roomName: room.name,
        classCounts: classCountsRecord,
        total: roomStudentCount,
      });
    }
  }

  const arrangement: SeatingArrangement = {
    id: `seating-${session.id}`,
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    manualAllocations,
    onlineAllocations,
    roomDiagrams,
    roomSummaries: roomSummariesList,
  };

  return {
    arrangement,
    warnings,
    summary: {
      totalStudents: totalStudentsCount,
      totalManualStudents: manualStudents.length,
      totalOnlineStudents: onlineStudents.length,
      manualCapacityAvailable,
      onlineCapacityAvailable,
      requiredRoomsCount,
    },
  };
};

export const generateClassAllocationDiagrams = (
  session: ExamSession,
  allStudents: Student[],
  allClasses: ClassItem[],
  allCategories: Category[],
  allRooms: Room[]
): { classDiagrams: ClassRoomDiagram[]; warnings: string[] } => {
  const warnings: string[] = [];

  const classMap = new Map<string, ClassItem>();
  allClasses.forEach((c) => classMap.set(c.id, c));

  const categoryMap = new Map<string, Category>();
  allCategories.forEach((cat) => categoryMap.set(cat.id, cat));

  const sessionManualClassIds = new Set<string>();
  session.classConfigs.forEach((cfg) => {
    if (cfg.examMode === 'Manual') {
      sessionManualClassIds.add(cfg.classId);
    }
  });

  const manualStudents = allStudents.filter((st) => sessionManualClassIds.has(st.classId));

  const manualCategoryIds = new Set<string>();
  sessionManualClassIds.forEach((clsId) => {
    const cls = classMap.get(clsId);
    if (cls) manualCategoryIds.add(cls.categoryId);
  });

  const categoryStudentsMap = new Map<string, Student[]>();
  manualStudents.forEach((st) => {
    const cls = classMap.get(st.classId);
    if (!cls) return;
    const catId = cls.categoryId;
    if (!categoryStudentsMap.has(catId)) {
      categoryStudentsMap.set(catId, []);
    }
    categoryStudentsMap.get(catId)!.push(st);
  });

  const classDiagrams: ClassRoomDiagram[] = [];

  for (const catId of Array.from(manualCategoryIds)) {
    const catStudents = categoryStudentsMap.get(catId) || [];
    if (catStudents.length === 0) continue;

    const categoryObj = categoryMap.get(catId);
    const categoryName = categoryObj ? categoryObj.name : 'Category';

    const catClassIds = Array.from(new Set(catStudents.map((st) => st.classId)));
    const catRooms = allRooms.filter((r) => r.examMode === 'Manual' && r.categoryId === catId);

    if (catRooms.length === 0) {
      warnings.push(`No manual rooms configured for category "${categoryName}".`);
      continue;
    }

    const minRoomsForClasses = Math.min(catClassIds.length, catRooms.length);
    const catAllocatedRooms: Room[] = [];
    let cumulativeCapacity = 0;

    for (const r of catRooms) {
      const rCap = roomCapacity(r);
      catAllocatedRooms.push(r);
      cumulativeCapacity += rCap;
      if (
        catAllocatedRooms.length >= minRoomsForClasses &&
        cumulativeCapacity >= catStudents.length
      ) {
        break;
      }
    }

    if (cumulativeCapacity < catStudents.length) {
      warnings.push(
        `Capacity in category "${categoryName}" (${cumulativeCapacity}) is less than required students (${catStudents.length}).`
      );
    }

    // Build a balanced allocation plan:
    //  1. Room totals are as even as possible (differ by at most 1), respecting capacity.
    //  2. Every class is spread across every room as evenly as possible (per-class diff <= 1).
    const plan = computeCategoryPlan(catStudents, catClassIds, catAllocatedRooms);

    for (let rIndex = 0; rIndex < plan.allocatedRooms.length; rIndex++) {
      const room = plan.allocatedRooms[rIndex];
      if (!room.sides || room.sides.length === 0) continue;

      const roomSidesData: ClassRoomDiagram['sides'] = room.sides.map((side) => {
        const grid: (string | null)[][] = Array.from({ length: side.rows }, () =>
          Array(side.cols).fill(null)
        );
        return {
          sideId: side.id,
          sideName: side.sideName,
          cols: side.cols,
          rows: side.rows,
          grid,
        };
      });

      // Remaining seats to fill per class in THIS room (from the balanced plan)
      const roomQuota = plan.quotas[rIndex].slice();
      let roomSeatsFilled = 0;
      let classTurnIndex = 0;

      for (const sideData of roomSidesData) {
        for (let r = 0; r < sideData.rows; r++) {
          for (let c = 0; c < sideData.cols; c++) {
            const roomRemaining = roomQuota.reduce((sum, q) => sum + q, 0);
            if (roomRemaining === 0) break;

            let chosenClassIdx = -1;

            // Interleave & check adjacency (only classes with remaining quota in this room)
            for (let attempt = 0; attempt < plan.classIds.length; attempt++) {
              const qIdx = (classTurnIndex + attempt) % plan.classIds.length;
              if (roomQuota[qIdx] <= 0) continue;
              const candClassId = plan.classIds[qIdx];

              if (
                !hasAdjacentClassConflict(
                  sideData.grid,
                  sideData.rows,
                  sideData.cols,
                  candClassId,
                  r,
                  c
                )
              ) {
                chosenClassIdx = qIdx;
                classTurnIndex = (qIdx + 1) % plan.classIds.length;
                break;
              }
            }

            // Fallback: pick class with most remaining quota in this room
            if (chosenClassIdx === -1) {
              let maxQuota = -1;
              for (let i = 0; i < roomQuota.length; i++) {
                if (roomQuota[i] > maxQuota) {
                  maxQuota = roomQuota[i];
                  chosenClassIdx = i;
                }
              }
            }

            if (chosenClassIdx !== -1 && roomQuota[chosenClassIdx] > 0) {
              sideData.grid[r][c] = plan.classIds[chosenClassIdx];
              roomQuota[chosenClassIdx]--;
              roomSeatsFilled++;
            }
          }
        }
      }

      classDiagrams.push({
        roomId: room.id,
        roomName: room.name,
        categoryId: catId,
        categoryName,
        sides: roomSidesData,
      });
    }
  }

  return { classDiagrams, warnings };
};

export const populateStudentsFromClassDiagrams = (
  classDiagrams: ClassRoomDiagram[],
  session: ExamSession,
  allStudents: Student[],
  allClasses: ClassItem[],
  allCategories: Category[],
  allRooms: Room[]
): SeatingArrangement => {
  const classMap = new Map<string, ClassItem>();
  allClasses.forEach((c) => classMap.set(c.id, c));

  const categoryMap = new Map<string, Category>();
  allCategories.forEach((cat) => categoryMap.set(cat.id, cat));

  // Sort students by admissionNo or name per class
  const classStudentsMap = new Map<string, Student[]>();
  allClasses.forEach((cls) => {
    const sts = allStudents
      .filter((s) => s.classId === cls.id)
      .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo, undefined, { numeric: true }));
    classStudentsMap.set(cls.id, [...sts]);
  });

  const manualAllocations: SeatAllocation[] = [];
  const roomDiagrams: RoomDiagramData[] = [];
  const roomSummariesList: SeatingArrangement['roomSummaries'] = [];

  for (const cDiag of classDiagrams) {
    const roomClassCountMap = new Map<string, number>();
    let roomStudentCount = 0;

    const roomSidesData: RoomDiagramData['sides'] = cDiag.sides.map((side) => {
      const grid: (SeatAllocation | null)[][] = Array.from({ length: side.rows }, () =>
        Array(side.cols).fill(null)
      );

      for (let r = 0; r < side.rows; r++) {
        for (let c = 0; c < side.cols; c++) {
          const classId = side.grid[r][c];
          if (!classId) continue;

          const queue = classStudentsMap.get(classId) || [];
          if (queue.length > 0) {
            const student = queue.shift()!;
            const cls = classMap.get(classId);
            const colLetter = getColumnLetter(c);
            const seatId = `${colLetter}${r + 1}`;

            const allocation: SeatAllocation = {
              studentId: student.id,
              admissionNo: student.admissionNo,
              studentName: student.name,
              classId: student.classId,
              className: cls ? cls.name : 'Unknown',
              categoryId: cDiag.categoryId,
              roomId: cDiag.roomId,
              roomName: cDiag.roomName,
              sideId: side.sideId,
              sideName: side.sideName,
              seatId,
              colIndex: c,
              rowIndex: r,
            };

            grid[r][c] = allocation;
            manualAllocations.push(allocation);

            const cName = cls ? cls.name : 'Unknown';
            roomClassCountMap.set(cName, (roomClassCountMap.get(cName) || 0) + 1);
            roomStudentCount++;
          }
        }
      }

      return {
        sideId: side.sideId,
        sideName: side.sideName,
        cols: side.cols,
        rows: side.rows,
        grid,
      };
    });

    const classSummary: RoomClassSummary[] = [];
    const classCountsRecord: { [clsName: string]: number } = {};

    roomClassCountMap.forEach((cnt, cName) => {
      classSummary.push({ classId: '', className: cName, count: cnt });
      classCountsRecord[cName] = cnt;
    });
    classSummary.sort((a, b) => a.className.localeCompare(b.className));

    roomDiagrams.push({
      roomId: cDiag.roomId,
      roomName: cDiag.roomName,
      categoryId: cDiag.categoryId,
      categoryName: cDiag.categoryName,
      totalStudents: roomStudentCount,
      sides: roomSidesData,
      classSummary,
    });

    roomSummariesList.push({
      roomId: cDiag.roomId,
      roomName: cDiag.roomName,
      classCounts: classCountsRecord,
      total: roomStudentCount,
    });
  }

  // Handle Online allocations
  const onlineAllocations: OnlineAllocation[] = [];
  const sessionOnlineClassIds = new Set<string>();
  session.classConfigs.forEach((cfg) => {
    if (cfg.examMode === 'Online') sessionOnlineClassIds.add(cfg.classId);
  });
  const onlineStudents = allStudents.filter((st) => sessionOnlineClassIds.has(st.classId));
  const availableOnlineRooms = allRooms.filter((r) => r.examMode === 'Online');

  if (onlineStudents.length > 0) {
    let currentOnlineStudentIndex = 0;
    for (const room of availableOnlineRooms) {
      if (currentOnlineStudentIndex >= onlineStudents.length) break;
      const slots = room.onlineSlots && room.onlineSlots.length > 0 ? room.onlineSlots : ['Slot 1'];
      const capPerSlot = Math.ceil((room.onlineCapacity || 30) / slots.length);
      let currentSlotIdx = 0;
      const slotCounts = new Array(slots.length).fill(0);

      while (
        currentOnlineStudentIndex < onlineStudents.length &&
        slotCounts.some((cnt) => cnt < capPerSlot)
      ) {
        let attempts = 0;
        while (slotCounts[currentSlotIdx] >= capPerSlot && attempts < slots.length) {
          currentSlotIdx = (currentSlotIdx + 1) % slots.length;
          attempts++;
        }
        if (attempts >= slots.length) break;

        const student = onlineStudents[currentOnlineStudentIndex];
        const cls = classMap.get(student.classId);
        const slotName = slots[currentSlotIdx];

        onlineAllocations.push({
          studentId: student.id,
          admissionNo: student.admissionNo,
          studentName: student.name,
          classId: student.classId,
          className: cls ? cls.name : 'Unknown',
          categoryId: cls ? cls.categoryId : 'Unknown',
          roomId: room.id,
          roomName: room.name,
          slotName: slotName,
        });

        slotCounts[currentSlotIdx]++;
        currentOnlineStudentIndex++;
        currentSlotIdx = (currentSlotIdx + 1) % slots.length;
      }
    }
  }

  return {
    id: `seating-${session.id}`,
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    manualAllocations,
    onlineAllocations,
    roomDiagrams,
    roomSummaries: roomSummariesList,
  };
};
