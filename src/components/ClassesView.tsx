import React, { useState } from 'react';
import { Plus, Edit2, Trash2, GraduationCap, AlertCircle, Users, Upload, CheckCircle2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Category, ClassItem, Student } from '../types';

interface ClassesViewProps {
  categories: Category[];
  classes: ClassItem[];
  students: Student[];
  onSaveClassItem: (cls: ClassItem) => Promise<void>;
  onSaveBulkClasses?: (classes: ClassItem[]) => Promise<void>;
  onDeleteClassItem: (id: string) => Promise<void>;
  onDeleteBulkClasses?: (ids: string[]) => Promise<void>;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  categories,
  classes,
  students,
  onSaveClassItem,
  onSaveBulkClasses,
  onDeleteClassItem,
  onDeleteBulkClasses,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'selected' | 'all';
  }>({ isOpen: false, mode: 'selected' });

  // Bulk Import (Excel / CSV)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<
    { name: string; categoryId: string; categoryName: string; error?: string }[]
  >([]);
  const [bulkErrorMsg, setBulkErrorMsg] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  const filteredClasses = classes.filter((cls) =>
    selectedCategoryFilter === 'all' ? true : cls.categoryId === selectedCategoryFilter
  );

  const isAllSelected =
    filteredClasses.length > 0 && filteredClasses.every((c) => selectedIds.includes(c.id));

  const handleToggleSelectAll = () => {
    const filteredIds = filteredClasses.map((c) => c.id);
    if (isAllSelected) {
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
      if (onDeleteBulkClasses) {
        await onDeleteBulkClasses(selectedIds);
      } else {
        for (const id of selectedIds) {
          await onDeleteClassItem(id);
        }
      }
      setSelectedIds([]);
    } else if (bulkDeleteModal.mode === 'all') {
      const allIds = classes.map((c) => c.id);
      if (onDeleteBulkClasses) {
        await onDeleteBulkClasses(allIds);
      } else {
        for (const id of allIds) {
          await onDeleteClassItem(id);
        }
      }
      setSelectedIds([]);
    }
    setBulkDeleteModal({ isOpen: false, mode: 'selected' });
  };

  const handleOpenAdd = () => {
    setEditingClass(null);
    setName('');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setName(cls.name);
    setCategoryId(cls.categoryId);
    setIsModalOpen(true);
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

        // Existing classes keyed by (name, category) to detect duplicates
        const existingSet = new Set(
          classes.map((c) => `${c.name.toLowerCase()}::${c.categoryId}`)
        );
        const seenInFile = new Set<string>();
        const parsedRows: typeof bulkPreview = [];

        rawJson.forEach((row) => {
          const clsName = String(
            row['Class Name'] || row['ClassName'] || row['Name'] || row['name'] || row['Class'] || ''
          ).trim();
          const catName = String(row['Category'] || row['category'] || '').trim();

          const matchedCat = categories.find(
            (cat) => cat.name.toLowerCase() === catName.toLowerCase()
          );

          let err = '';
          if (!clsName) err = 'Missing Class Name';
          else if (!matchedCat) err = catName ? 'Unknown Category' : 'Missing Category';
          else {
            const key = `${clsName.toLowerCase()}::${matchedCat.id}`;
            if (existingSet.has(key) || seenInFile.has(key)) err = 'Duplicate Class';
            else seenInFile.add(key);
          }

          parsedRows.push({
            name: clsName,
            categoryId: matchedCat ? matchedCat.id : '',
            categoryName: matchedCat ? matchedCat.name : catName || 'Unassigned',
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
    const validRows = bulkPreview.filter((r) => !r.error && r.name && r.categoryId);

    if (validRows.length === 0) {
      setBulkErrorMsg('No valid rows to import.');
      return;
    }

    const newClasses: ClassItem[] = validRows.map((r, idx) => ({
      id: `cls-bulk-${Date.now()}-${idx}`,
      name: r.name,
      categoryId: r.categoryId,
      createdAt: new Date().toISOString(),
    }));

    if (onSaveBulkClasses) {
      await onSaveBulkClasses(newClasses);
    } else {
      for (const cls of newClasses) {
        await onSaveClassItem(cls);
      }
    }
    setIsBulkModalOpen(false);
    setBulkPreview([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    const clsObj: ClassItem = {
      id: editingClass ? editingClass.id : `cls-${Date.now()}`,
      name: name.trim(),
      categoryId,
      createdAt: editingClass ? editingClass.createdAt : new Date().toISOString(),
    };

    await onSaveClassItem(clsObj);
    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await onDeleteClassItem(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Exam Classes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Classes: <strong className="text-slate-800">{classes.length}</strong> | Selected: <strong className="text-emerald-700">{selectedIds.length}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {filteredClasses.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center"
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => {}}
                className="w-3.5 h-3.5 mr-1.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 pointer-events-none"
              />
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal({ isOpen: true, mode: 'selected' })}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Selected ({selectedIds.length})
            </button>
          )}

          {classes.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal({ isOpen: true, mode: 'all' })}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl flex items-center transition"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Classes
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Class
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((cls) => {
          const category = catMap.get(cls.categoryId);
          const studentCount = students.filter((st) => st.classId === cls.id).length;
          const isChecked = selectedIds.includes(cls.id);

          return (
            <div
              key={cls.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between hover:shadow-md transition ${
                isChecked ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelectOne(cls.id)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{cls.name}</h3>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md border border-slate-200">
                        {category ? category.name : 'No Category'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium">Registered Students:</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{studentCount}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEdit(cls)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Edit Class"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(cls.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. S1, S2, SS1, DEG1"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
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
                  {editingClass ? 'Save Changes' : 'Create Class'}
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
                  Bulk Class Import (Excel / CSV)
                </h3>
                <p className="text-xs text-slate-500">
                  Expected headers: <strong>Class Name, Category</strong>
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {categories.length === 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                No categories found. Create categories first so imported classes can be assigned to them.
              </div>
            )}

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
                      <th className="py-2 px-3">Class Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkPreview.map((row, idx) => (
                      <tr key={idx} className={row.error ? 'bg-rose-50/50' : 'bg-white'}>
                        <td className="py-2 px-3 font-medium">{row.name}</td>
                        <td className="py-2 px-3">{row.categoryName}</td>
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
                ? `Delete ${selectedIds.length} Selected Class(es)?`
                : `Delete ALL ${classes.length} Classes?`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {bulkDeleteModal.mode === 'selected'
                ? `Are you sure you want to permanently delete the ${selectedIds.length} selected class(es)?`
                : `WARNING: Are you sure you want to delete ALL ${classes.length} classes? This action cannot be undone.`}
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
                  : 'Delete ALL Classes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Class?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this class? Students linked to this class should be updated.
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
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
