/**
 * Validation script for the balanced seating distribution rules.
 * Reproduces the user's example scenarios:
 *   A) Category "Secondary" with classes S1(40), S2(38), S3(42), S4(39) → 159 students,
 *      4 manual rooms of capacity 40 each.
 *   B) 154 students across 4 rooms of capacity 40 → expect 39,39,38,38 with vacancies 1,1,2,2.
 *
 * Checks:
 *   - every room contains every class participating in the category
 *   - per-class counts across rooms differ by at most 1
 *   - room totals differ by at most 1
 *   - all students are seated (or capacity warning surfaced)
 *   - vacant seats are spread evenly (diff <= 1)
 */
import { generateClassAllocationDiagrams, generateSeatingArrangement } from '../src/lib/seatingAlgorithm';
import { Category, ClassItem, Student, Room, ExamSession, ExamMode } from '../src/types';

const now = new Date().toISOString();

const buildScenario = (
  classDefs: { id: string; name: string; count: number }[],
  roomIds: string[],
  cols: number,
  rows: number
) => {
  const categories: Category[] = [{ id: 'cat-sec', name: 'Secondary', createdAt: now }];
  const classes: ClassItem[] = classDefs.map((c) => ({
    id: c.id,
    name: c.name,
    categoryId: 'cat-sec',
    createdAt: now,
  }));
  const students: Student[] = [];
  classDefs.forEach((c) => {
    for (let i = 0; i < c.count; i++) {
      students.push({
        id: `${c.id}-${i}`,
        admissionNo: `${c.name}-${String(i + 1).padStart(3, '0')}`,
        name: `Student ${c.name} ${i + 1}`,
        classId: c.id,
        createdAt: now,
      });
    }
  });
  const rooms: Room[] = roomIds.map((id) => ({
    id,
    name: id,
    categoryId: 'cat-sec',
    examMode: 'Manual',
    sides: [
      { id: `${id}-side-a`, sideName: 'Side A', cols, rows },
      { id: `${id}-side-b`, sideName: 'Side B', cols, rows },
    ],
    createdAt: now,
  }));
  const session: ExamSession = {
    id: 'sess-1',
    name: 'Session',
    date: '2026-08-08',
    time: '09:30 AM - 12:30 PM',
    classConfigs: classDefs.map((c) => ({ classId: c.id, examMode: 'Manual' })),
    createdAt: now,
  };
  return { categories, classes, students, rooms, session };
};

const roomCapacity = (cols: number, rows: number) => cols * rows * 2;

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`  FAIL: ${msg}`);
};

const runScenario = (
  name: string,
  classDefs: { id: string; name: string; count: number }[],
  roomIds: string[],
  cols: number,
  rows: number,
  expectations: { totals: number[] }
) => {
  const { categories, classes, students, rooms, session } = buildScenario(classDefs, roomIds, cols, rows);
  const { classDiagrams, warnings } = generateClassAllocationDiagrams(session, students, classes, categories, rooms);
  const cap = roomCapacity(cols, rows);

  console.log(`\n=== Scenario: ${name} (${students.length} students, ${roomIds.length} rooms x ${cap} cap) ===`);
  warnings.forEach((w) => console.log('  warning:', w));

  const roomRows: { room: string; counts: Record<string, number>; total: number }[] = [];
  for (const diag of classDiagrams) {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const side of diag.sides) {
      for (const row of side.grid) {
        for (const cid of row) {
          if (cid) {
            counts[cid] = (counts[cid] || 0) + 1;
            total++;
          }
        }
      }
    }
    roomRows.push({ room: diag.roomName, counts, total });
  }

  const totals = roomRows.map((r) => r.total);
  console.log(`  Room totals: ${totals.join(', ')} (vacancies: ${totals.map((t) => cap - t).join(', ')})`);
  classDefs.forEach((c) => {
    console.log(
      `  ${c.name}: ${roomRows.map((r) => r.counts[c.id] || 0).join(', ')}`
    );
  });

  // 1. Every room contains every class participating in the category
  for (const row of roomRows) {
    for (const c of classDefs) {
      if (!(c.id in row.counts) || row.counts[c.id] <= 0) {
        fail(`${row.room} missing class ${c.name}`);
      }
    }
  }

  // 2. Per-class balance: diff between any two rooms <= 1
  for (const c of classDefs) {
    const values = roomRows.map((r) => r.counts[c.id] || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max - min > 1) {
      fail(`Class ${c.name} imbalance: values ${values.join(', ')} (diff ${max - min} > 1)`);
    }
  }

  // 3. Room total balance: diff <= 1 (or exactly matches expected totals)
  const maxTotal = Math.max(...totals);
  const minTotal = Math.min(...totals);
  if (expectations.totals.length > 0) {
    const sortedExpected = [...expectations.totals].sort((a, b) => a - b);
    const sortedActual = [...totals].sort((a, b) => a - b);
    if (JSON.stringify(sortedExpected) !== JSON.stringify(sortedActual)) {
      fail(`Room totals ${totals.join(', ')} != expected ${expectations.totals.join(', ')}`);
    }
  } else if (maxTotal - minTotal > 1) {
    fail(`Room totals imbalance: ${totals.join(', ')} (diff ${maxTotal - minTotal} > 1)`);
  }

  // 4. Total seats allocated == total students (capacity permitting)
  const expectedTotal = students.length;
  const actualTotal = totals.reduce((a, b) => a + b, 0);
  if (actualTotal !== expectedTotal) {
    fail(`Total students mismatch: allocated ${actualTotal}, expected ${expectedTotal}`);
  }

  // 5. Vacancy distribution: vacancies across rooms differ by at most 1
  if (actualTotal === expectedTotal) {
    const vacancies = totals.map((t) => cap - t);
    const maxV = Math.max(...vacancies);
    const minV = Math.min(...vacancies);
    if (maxV - minV > 1) {
      fail(`Vacancy imbalance: ${vacancies.join(', ')} (diff ${maxV - minV} > 1)`);
    }
  }

  // 6. Adjacency (informational — lowest priority per spec): same class in adjacent
  //    columns within +/-1 row. Fallback placements at the tail may violate when a
  //    class's quota forces it; report count but do not fail.
  let adjacencyViolations = 0;
  for (const diag of classDiagrams) {
    for (const side of diag.sides) {
      const { grid, rows: gRows, cols: gCols } = side;
      for (let r = 0; r < gRows; r++) {
        for (let c = 0; c < gCols; c++) {
          const cid = grid[r][c];
          if (!cid) continue;
          if (c > 0) {
            for (let adjR = Math.max(0, r - 1); adjR <= Math.min(gRows - 1, r + 1); adjR++) {
              if (grid[adjR][c - 1] === cid) adjacencyViolations++;
            }
          }
          if (c < gCols - 1) {
            for (let adjR = Math.max(0, r - 1); adjR <= Math.min(gRows - 1, r + 1); adjR++) {
              if (grid[adjR][c + 1] === cid) adjacencyViolations++;
            }
          }
        }
      }
    }
  }
  console.log(`  Adjacency violations (informational): ${adjacencyViolations}`);
};

// Scenario A: the user's class-distribution example (159 students)
runScenario(
  'User example: S1-S4 (159 students)',
  [
    { id: 's1', name: 'S1', count: 40 },
    { id: 's2', name: 'S2', count: 38 },
    { id: 's3', name: 'S3', count: 42 },
    { id: 's4', name: 'S4', count: 39 },
  ],
  ['Room 1', 'Room 2', 'Room 3', 'Room 4'],
  4,
  5,
  { totals: [40, 40, 39, 40] } // balanced 159 over 160 cap → 40,40,40,39 (any ordering)
);

// Scenario B: equal room occupancy example (154 students -> 39,39,38,38)
runScenario(
  'Equal occupancy: 154 students',
  [
    { id: 'a1', name: 'A1', count: 39 },
    { id: 'a2', name: 'A2', count: 39 },
    { id: 'a3', name: 'A3', count: 38 },
    { id: 'a4', name: 'A4', count: 38 },
  ],
  ['Room 1', 'Room 2', 'Room 3', 'Room 4'],
  4,
  5,
  { totals: [39, 39, 38, 38] }
);

console.log('\n========================================');
console.log('=== End-to-end: generateSeatingArrangement (manual + online) ===');
{
  const { categories, classes, students, rooms, session } = buildScenario(
    [
      { id: 's1', name: 'S1', count: 40 },
      { id: 's2', name: 'S2', count: 38 },
      { id: 's3', name: 'S3', count: 42 },
      { id: 's4', name: 'S4', count: 39 },
    ],
    ['Room 1', 'Room 2', 'Room 3', 'Room 4'],
    4,
    5
  );
  const onlineRoom: Room = {
    id: 'ol1',
    name: 'Computer Lab 1',
    categoryId: 'cat-sec',
    examMode: 'Online',
    onlineCapacity: 30,
    onlineSlots: ['Slot 1', 'Slot 2'],
    createdAt: now,
  };
  const onlineClass: ClassItem = { id: 'ol-cls', name: 'OL1', categoryId: 'cat-sec', createdAt: now };
  const onlineStudents: Student[] = [];
  for (let i = 0; i < 30; i++) {
    onlineStudents.push({ id: `ol-${i}`, admissionNo: `OL-${i}`, name: `Online ${i}`, classId: 'ol-cls', createdAt: now });
  }
  const allRooms = [...rooms, onlineRoom];
  const e2eSession: ExamSession = {
    ...session,
    id: 'sess-e2e',
    classConfigs: [
      ...session.classConfigs,
      { classId: 'ol-cls', examMode: 'Online' as ExamMode },
    ],
  };
  const { arrangement, warnings: e2eWarnings, summary } = generateSeatingArrangement(
    e2eSession,
    [...students, ...onlineStudents],
    [...classes, onlineClass],
    categories,
    allRooms
  );
  e2eWarnings.forEach((w) => console.log('  warning:', w));
  const manualCount = arrangement.manualAllocations.length;
  const onlineCount = arrangement.onlineAllocations.length;
  console.log(`  manual seated: ${manualCount} (expected ${students.length})`);
  console.log(`  online seated: ${onlineCount} (expected 30)`);
  console.log(`  summary: total=${summary.totalStudents} manual=${summary.totalManualStudents} online=${summary.totalOnlineStudents}`);
  const roomTotals = arrangement.roomDiagrams.map((d) => d.totalStudents);
  console.log(`  room totals: ${roomTotals.join(', ')}`);
  if (manualCount !== students.length) fail(`End-to-end manual mismatch: ${manualCount} != ${students.length}`);
  if (onlineCount !== 30) fail(`End-to-end online mismatch: ${onlineCount} != 30`);
  if (Math.max(...roomTotals) - Math.min(...roomTotals) > 1) {
    fail(`End-to-end room totals imbalance: ${roomTotals.join(', ')}`);
  }
  // Online students must only be in online rooms
  const badOnline = arrangement.onlineAllocations.filter(
    (a) => !allRooms.some((r) => r.id === a.roomId && r.examMode === 'Online')
  );
  if (badOnline.length > 0) fail(`${badOnline.length} online allocations outside online rooms`);
}

console.log('\n========================================');
if (failures === 0) {
  console.log('ALL BALANCING CHECKS PASSED ✔');
} else {
  console.log(`${failures} check(s) FAILED ✘`);
  process.exit(1);
}
