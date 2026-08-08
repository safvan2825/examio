import React, { useState } from 'react';
import { Plus, Edit2, Trash2, FolderTree, AlertCircle } from 'lucide-react';
import { Category, ClassItem, Room } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  classes: ClassItem[];
  rooms: Room[];
  onSaveCategory: (cat: Category) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onDeleteBulkCategories?: (ids: string[]) => Promise<void>;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  classes,
  rooms,
  onSaveCategory,
  onDeleteCategory,
  onDeleteBulkCategories,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'selected' | 'all';
  }>({ isOpen: false, mode: 'selected' });

  // Delete modal confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAllSelected =
    categories.length > 0 && categories.every((cat) => selectedIds.includes(cat.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categories.map((c) => c.id));
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
      if (onDeleteBulkCategories) {
        await onDeleteBulkCategories(selectedIds);
      } else {
        for (const id of selectedIds) {
          await onDeleteCategory(id);
        }
      }
      setSelectedIds([]);
    } else if (bulkDeleteModal.mode === 'all') {
      const allIds = categories.map((c) => c.id);
      if (onDeleteBulkCategories) {
        await onDeleteBulkCategories(allIds);
      } else {
        for (const id of allIds) {
          await onDeleteCategory(id);
        }
      }
      setSelectedIds([]);
    }
    setBulkDeleteModal({ isOpen: false, mode: 'selected' });
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const catObj: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      createdAt: editingCategory ? editingCategory.createdAt : new Date().toISOString(),
    };

    await onSaveCategory(catObj);
    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await onDeleteCategory(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Exam Categories</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Categories: <strong className="text-slate-800">{categories.length}</strong> | Selected: <strong className="text-emerald-700">{selectedIds.length}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 0 && (
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

          {categories.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal({ isOpen: true, mode: 'all' })}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl flex items-center transition"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Categories
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const linkedClassesCount = classes.filter((c) => c.categoryId === cat.id).length;
          const linkedRoomsCount = rooms.filter((r) => r.categoryId === cat.id).length;
          const isChecked = selectedIds.includes(cat.id);

          return (
            <div
              key={cat.id}
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
                      onChange={() => handleToggleSelectOne(cat.id)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                      <FolderTree className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                      <p className="text-[11px] text-slate-500">ID: {cat.id}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2">
                  {cat.description || 'No description provided.'}
                </p>

                <div className="mt-4 flex items-center space-x-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span>
                    Classes: <strong className="text-slate-800">{linkedClassesCount}</strong>
                  </span>
                  <span>
                    Rooms: <strong className="text-slate-800">{linkedRoomsCount}</strong>
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Edit Category"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(cat.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Secondary, Senior Secondary, Degree"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief details regarding this category..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
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
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
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
                ? `Delete ${selectedIds.length} Selected Category(ies)?`
                : `Delete ALL ${categories.length} Categories?`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {bulkDeleteModal.mode === 'selected'
                ? `Are you sure you want to permanently delete the ${selectedIds.length} selected category(ies)?`
                : `WARNING: Are you sure you want to delete ALL ${categories.length} categories? Classes and rooms under these categories may lose their categorization.`}
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
                  : 'Delete ALL Categories'}
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
            <h3 className="text-sm font-bold text-slate-900">Delete Category?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this category? Classes and rooms under this category
              may lose their categorization.
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
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
