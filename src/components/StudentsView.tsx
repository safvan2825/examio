import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Search,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, ClassItem } from '../types';

interface StudentsViewProps {
  students: Student[];
  classes: ClassItem[];
  onSaveStudent: (student: Student) => Promise<void>;
  onSaveBulkStudents: (students: Student[]) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onDeleteBulkStudents?: (ids: string[]) => Promise<void>;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  classes,
  onSaveStudent,
  onSaveBulkStudents,
  onDeleteStudent,
  onDeleteBulkStudents,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'selected' | 'all';
  }>({ isOpen: false, mode: 'selected' });

  // Single Student Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [admissionNo, setAdmissionNo] = useState('');
  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [formError, setFormError] = useState('');

  // Bulk Import Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<
    { admissionNo: string; name: string; classId: string; className: string; error?: string }[]
  >([]);
  const [bulkErrorMsg, setBulkErrorMsg] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const classMap = new Map<string, ClassItem>();
  classes.forEach((c) => classMap.set(c.id, c));

  // Filter students
  const filteredStudents = students.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' ? true : st.classId === classFilter;
    return matchesSearch && matchesClass;
  });

  const isAllFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((st) => selectedIds.includes(st.id));

  const handleToggleSelectAll = () => {
    const filteredIds = filteredStudents.map((st) => st.id);
    if (isAllFilteredSelected) {
      setSelectedIds(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedIds, ...filteredIds]));
      setSelectedIds(combined);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const confirmBulkDelete = async () => {
    if (bulkDeleteModal.mode === 'selected') {
      if (onDeleteBulkStudents) {
        await onDeleteBulkStudents(selectedIds);
      } else {
        for (const id of selectedIds) {
          await onDeleteStudent(id);
        }
      }
      setSelectedIds([]);
    } else if (bulkDeleteModal.mode === 'all') {
      const allIds = students.map((s) => s.id);
      if (onDeleteBulkStudents) {
        await onDeleteBulkStudents(allIds);
      } else {
        for (const id of allIds) {
          await onDeleteStudent(id);
        }
      }
      setSelectedIds([]);
    }
    setBulkDeleteModal({ isOpen: false, mode: 'selected' });
  };

  // Handle Single Student Open
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setAdmissionNo('');
    setName('');
    setClassId(classes.length > 0 ? classes[0].id : '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (st: Student) => {
    setEditingStudent(st);
    setAdmissionNo(st.admissionNo);
    setName(st.name);
    setClassId(st.classId);
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Single Student
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanAdm = admissionNo.trim();
    const cleanName = name.trim();

    if (!cleanAdm || !cleanName || !classId) {
      setFormError('All fields are required.');
      return;
    }

    // Validate duplicate admission number
    const duplicate = students.find(
      (s) => s.admissionNo.toLowerCase() === cleanAdm.toLowerCase() && s.id !== editingStudent?.id
    );

    if (duplicate) {
      setFormError(`Admission Number "${cleanAdm}" already exists for student: ${duplicate.name}`);
      return;
    }

    const stObj: Student = {
      id: editingStudent ? editingStudent.id : `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      admissionNo: cleanAdm,
      name: cleanName,
      classId,
      createdAt: editingStudent ? editingStudent.createdAt : new Date().toISOString(),
    };

    await onSaveStudent(stObj);
    setIsModalOpen(false);
  };

  // Handle Bulk Import File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkErrorMsg('');
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          setBulkErrorMsg('Selected file is empty.');
          return;
        }

        // Map existing admission numbers to detect duplicates
        const existingAdmSet = new Set(students.map((s) => s.admissionNo.toLowerCase()));
        const parsedRows: typeof bulkPreview = [];

        rawJson.forEach((row, idx) => {
          const adm = String(row['Admission Number'] || row['AdmissionNo'] || row['Admission No'] || row['AdmNo'] || row['adm'] || '').trim();
          const stName = String(row['Student Name'] || row['Name'] || row['StudentName'] || row['name'] || '').trim();
          const clsName = String(row['Class'] || row['ClassName'] || row['class'] || '').trim();

          let matchedClass = classes.find((c) => c.name.toLowerCase() === clsName.toLowerCase());
          if (!matchedClass && classes.length > 0) {
            matchedClass = classes[0]; // default fallback
          }

          let err = '';
          if (!adm) err = 'Missing Admission No';
          else if (!stName) err = 'Missing Student Name';
          else if (existingAdmSet.has(adm.toLowerCase())) err = 'Duplicate Admission No';

          parsedRows.push({
            admissionNo: adm,
            name: stName,
            classId: matchedClass ? matchedClass.id : '',
            className: matchedClass ? matchedClass.name : 'Unassigned',
            error: err,
          });
        });

        setBulkPreview(parsedRows);
      } catch (err: any) {
        setBulkErrorMsg('Failed to parse file. Please upload a valid CSV or Excel file.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const confirmBulkImport = async () => {
    const validRows = bulkPreview.filter((r) => !r.error && r.admissionNo && r.name && r.classId);

    if (validRows.length === 0) {
      setBulkErrorMsg('No valid rows to import.');
      return;
    }

    const newStudents: Student[] = validRows.map((r, idx) => ({
      id: `st-bulk-${Date.now()}-${idx}`,
      admissionNo: r.admissionNo,
      name: r.name,
      classId: r.classId,
      createdAt: new Date().toISOString(),
    }));

    await onSaveBulkStudents(newStudents);
    setIsBulkModalOpen(false);
    setBulkPreview([]);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await onDeleteStudent(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Student Register</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Students: <strong className="text-slate-800">{students.length}</strong> | Selected: <strong className="text-emerald-700">{selectedIds.length}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal({ isOpen: true, mode: 'selected' })}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Selected ({selectedIds.length})
            </button>
          )}

          {students.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal({ isOpen: true, mode: 'all' })}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl flex items-center transition"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Students
            </button>
          )}

          <button
            onClick={() => {
              setBulkPreview([]);
              setBulkErrorMsg('');
              setIsBulkModalOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 flex items-center transition"
          >
            <Upload className="w-4 h-4 mr-1.5 text-blue-600" />
            Bulk Import (Excel/CSV)
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Admission No or Student Name..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none shrink-0"
        >
          <option value="all">All Classes ({students.length})</option>
          {classes.map((c) => {
            const cnt = students.filter((st) => st.classId === c.id).length;
            return (
              <option key={c.id} value={c.id}>
                {c.name} ({cnt})
              </option>
            );
          })}
        </select>
      </div>

      {/* Selection Summary Bar if any selected */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center space-x-2">
            <span className="font-bold">{selectedIds.length} student(s) selected</span>
            <span className="text-emerald-600">•</span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-emerald-700 underline hover:text-emerald-900 font-medium"
            >
              Clear Selection
            </button>
          </div>
          <button
            onClick={() => setBulkDeleteModal({ isOpen: true, mode: 'selected' })}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-500 transition text-xs flex items-center"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Admission No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No students match your search query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const cls = classMap.get(st.classId);
                  const isChecked = selectedIds.includes(st.id);
                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-slate-50/80 transition ${isChecked ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(st.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">{st.admissionNo}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{st.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {cls ? cls.name : 'Unknown Class'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(st.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h3>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admission Number *
                </label>
                <input
                  type="text"
                  required
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                  placeholder="e.g. NH-1001"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class *</label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition"
                >
                  {editingStudent ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Bulk Student Import (Excel / CSV)
                </h3>
                <p className="text-xs text-slate-500">
                  Expected headers: <strong>Admission Number, Student Name, Class</strong>
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition cursor-pointer"
              />
            </div>

            {bulkErrorMsg && (
              <p className="text-xs text-rose-600 font-medium mb-3">{bulkErrorMsg}</p>
            )}

            {bulkPreview.length > 0 && (
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl mb-4 text-xs">
                <table className="w-full text-left divide-y divide-slate-100">
                  <thead className="bg-slate-50 sticky top-0 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Admission No</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Class</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkPreview.map((row, idx) => (
                      <tr key={idx} className={row.error ? 'bg-rose-50/50' : 'bg-white'}>
                        <td className="py-2 px-3 font-mono font-medium">{row.admissionNo}</td>
                        <td className="py-2 px-3">{row.name}</td>
                        <td className="py-2 px-3">{row.className}</td>
                        <td className="py-2 px-3 text-right">
                          {row.error ? (
                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                              {row.error}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded flex items-center justify-end">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {bulkPreview.filter((r) => !r.error).length} valid rows ready to import
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  disabled={bulkPreview.filter((r) => !r.error).length === 0}
                  onClick={confirmBulkImport}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-xs transition"
                >
                  Commit Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {bulkDeleteModal.mode === 'selected'
                ? `Delete ${selectedIds.length} Selected Student(s)?`
                : `Delete ALL ${students.length} Students?`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {bulkDeleteModal.mode === 'selected'
                ? `Are you sure you want to permanently delete the ${selectedIds.length} selected student record(s)?`
                : `WARNING: Are you sure you want to delete ALL ${students.length} student records from the database? This action cannot be undone.`}
            </p>

            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                onClick={() => setBulkDeleteModal({ isOpen: false, mode: 'selected' })}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition"
              >
                {bulkDeleteModal.mode === 'selected'
                  ? `Delete ${selectedIds.length} Selected`
                  : 'Delete ALL Students'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Student Record?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this student from the register?
            </p>

            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
