import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Grid,
  Monitor,
  Armchair,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { Room, Category, RoomSide } from '../types';

interface RoomsViewProps {
  rooms: Room[];
  categories: Category[];
  onSaveRoom: (room: Room) => Promise<void>;
  onDeleteRoom: (id: string) => Promise<void>;
  onDeleteBulkRooms?: (ids: string[]) => Promise<void>;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
  rooms,
  categories,
  onSaveRoom,
  onDeleteRoom,
  onDeleteBulkRooms,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    isOpen: boolean;
    mode: 'selected' | 'all';
  }>({ isOpen: false, mode: 'selected' });

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [examMode, setExamMode] = useState<'Manual' | 'Online'>('Manual');

  // Manual Sides Builder
  const [sides, setSides] = useState<RoomSide[]>([
    { id: 's1', sideName: 'Door Side', cols: 3, rows: 5 },
    { id: 's2', sideName: 'Window Side', cols: 3, rows: 5 },
  ]);

  // Online Fields
  const [onlineCapacity, setOnlineCapacity] = useState<number>(30);
  const [onlineSlotsText, setOnlineSlotsText] = useState<string>('Slot 1, Slot 2');

  // Delete modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setName('');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setExamMode('Manual');
    setSides([
      { id: `side-${Date.now()}-1`, sideName: 'Door Side', cols: 3, rows: 5 },
      { id: `side-${Date.now()}-2`, sideName: 'Window Side', cols: 3, rows: 5 },
    ]);
    setOnlineCapacity(30);
    setOnlineSlotsText('Slot 1, Slot 2');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setCategoryId(room.categoryId);
    setExamMode(room.examMode);
    if (room.sides && room.sides.length > 0) {
      setSides(room.sides);
    } else {
      setSides([{ id: `side-${Date.now()}`, sideName: 'Door Side', cols: 3, rows: 5 }]);
    }
    setOnlineCapacity(room.onlineCapacity || 30);
    setOnlineSlotsText(room.onlineSlots?.join(', ') || 'Slot 1, Slot 2');
    setIsModalOpen(true);
  };

  // Helper side modifiers
  const handleAddSide = () => {
    setSides([
      ...sides,
      {
        id: `side-${Date.now()}`,
        sideName: `Side ${sides.length + 1}`,
        cols: 3,
        rows: 5,
      },
    ]);
  };

  const handleUpdateSide = (index: number, key: keyof RoomSide, value: any) => {
    const updated = [...sides];
    updated[index] = { ...updated[index], [key]: value };
    setSides(updated);
  };

  const handleRemoveSide = (index: number) => {
    if (sides.length <= 1) return;
    setSides(sides.filter((_, i) => i !== index));
  };

  // Total Capacity calculation
  const calculateCapacity = (r: Room) => {
    if (r.examMode === 'Online') {
      const slots = r.onlineSlots?.length || 1;
      return (r.onlineCapacity || 0) * slots;
    }
    let cap = 0;
    r.sides?.forEach((s) => (cap += s.cols * s.rows));
    return cap;
  };

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter a valid room name.');
      return;
    }

    if (!categoryId) {
      setFormError('Please select a category for this room. If no categories exist, create one under Category Management first.');
      return;
    }

    setIsSaving(true);
    try {
      const slotsArray = onlineSlotsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const roomObj: Room = {
        id: editingRoom ? editingRoom.id : `rm-${Date.now()}`,
        name: name.trim(),
        categoryId,
        examMode,
        sides: examMode === 'Manual' ? sides : undefined,
        onlineCapacity: examMode === 'Online' ? onlineCapacity : undefined,
        onlineSlots: examMode === 'Online' ? slotsArray : undefined,
        createdAt: editingRoom ? editingRoom.createdAt : new Date().toISOString(),
      };

      await onSaveRoom(roomObj);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save room. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await onDeleteRoom(deletingId);
      setDeletingId(null);
    }
  };

  const isAllSelected = rooms.length > 0 && rooms.every((r) => selectedIds.includes(r.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rooms.map((r) => r.id));
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
      if (onDeleteBulkRooms) {
        await onDeleteBulkRooms(selectedIds);
      } else {
        for (const id of selectedIds) {
          await onDeleteRoom(id);
        }
      }
      setSelectedIds([]);
    } else if (bulkDeleteModal.mode === 'all') {
      const allIds = rooms.map((r) => r.id);
      if (onDeleteBulkRooms) {
        await onDeleteBulkRooms(allIds);
      } else {
        for (const id of allIds) {
          await onDeleteRoom(id);
        }
      }
      setSelectedIds([]);
    }
    setBulkDeleteModal({ isOpen: false, mode: 'selected' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Exam Rooms & Layout Builder</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total Rooms: <strong className="text-slate-800">{rooms.length}</strong> | Selected: <strong className="text-emerald-700">{selectedIds.length}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rooms.length > 0 && (
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

          {rooms.length > 0 && (
            <button
              onClick={() => setBulkDeleteModal({ isOpen: true, mode: 'all' })}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl flex items-center transition"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete All Rooms
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Room
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rooms.map((room) => {
          const category = catMap.get(room.categoryId);
          const totalCap = calculateCapacity(room);
          const isChecked = selectedIds.includes(room.id);

          return (
            <div
              key={room.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between hover:shadow-md transition relative ${
                isChecked ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelectOne(room.id)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-900">{room.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            room.examMode === 'Online'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {room.examMode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Category: <strong className="text-slate-700">{category?.name || 'Unassigned'}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Breakdown */}
                {room.examMode === 'Manual' ? (
                  <div className="mt-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Room Capacity:</span>
                      <span className="text-emerald-600 font-bold text-sm">{totalCap} Seats</span>
                    </p>
                    <div className="text-[11px] text-slate-500 space-y-1">
                      {room.sides?.map((side, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>{side.sideName}:</span>
                          <span className="font-mono text-slate-700">
                            {side.cols} cols × {side.rows} rows ({side.cols * side.rows} seats)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 bg-cyan-50/50 p-3 rounded-xl border border-cyan-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Lab Capacity:</span>
                      <span className="text-cyan-700 font-bold text-sm">{totalCap} Students</span>
                    </p>
                    <div className="text-[11px] text-slate-600">
                      <p>
                        Slots ({room.onlineSlots?.length || 0}):{' '}
                        <span className="font-mono">{room.onlineSlots?.join(', ')}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEdit(room)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(room.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900">
              {editingRoom ? 'Edit Room Configuration' : 'Add New Exam Room'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Room 101, Computer Lab 1"
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExamMode('Manual')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center transition ${
                      examMode === 'Manual'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Armchair className="w-3.5 h-3.5 mr-1.5" /> Manual Seating
                  </button>
                  <button
                    type="button"
                    onClick={() => setExamMode('Online')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center transition ${
                      examMode === 'Online'
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5 mr-1.5" /> Online Exam Lab
                  </button>
                </div>
              </div>

              {/* MANUAL ROOM LAYOUT BUILDER */}
              {examMode === 'Manual' && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Room Layout Builder</h4>
                      <p className="text-[11px] text-slate-500">
                        Add room sides (e.g. Door Side, Window Side) and set matrix columns & rows.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSide}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-semibold rounded-lg transition"
                    >
                      + Add Side
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sides.map((side, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-5">
                          <label className="block text-[10px] font-semibold text-slate-500">
                            Side Name
                          </label>
                          <input
                            type="text"
                            value={side.sideName}
                            onChange={(e) => handleUpdateSide(idx, 'sideName', e.target.value)}
                            placeholder="Door Side, Window Side..."
                            className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500">
                            Columns
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={side.cols}
                            onChange={(e) =>
                              handleUpdateSide(idx, 'cols', parseInt(e.target.value) || 1)
                            }
                            className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-500">
                            Rows
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={side.rows}
                            onChange={(e) =>
                              handleUpdateSide(idx, 'rows', parseInt(e.target.value) || 1)
                            }
                            className="w-full text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          {sides.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSide(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-right text-xs font-bold text-emerald-700">
                    Calculated Total Capacity:{' '}
                    {sides.reduce((sum, s) => sum + s.cols * s.rows, 0)} Seats
                  </div>
                </div>
              )}

              {/* ONLINE LAB BUILDER */}
              {examMode === 'Online' && (
                <div className="border border-cyan-200 rounded-xl p-4 bg-cyan-50/30 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lab Capacity per Slot *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={onlineCapacity}
                      onChange={(e) => setOnlineCapacity(parseInt(e.target.value) || 1)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Exam Slots (comma separated) *
                    </label>
                    <input
                      type="text"
                      required
                      value={onlineSlotsText}
                      onChange={(e) => setOnlineSlotsText(e.target.value)}
                      placeholder="Slot 1, Slot 2, Slot 3"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Students will be assigned alternately across these slots.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving Room...' : editingRoom ? 'Save Changes' : 'Create Room'}
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
                ? `Delete ${selectedIds.length} Selected Room(s)?`
                : `Delete ALL ${rooms.length} Rooms?`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {bulkDeleteModal.mode === 'selected'
                ? `Are you sure you want to permanently delete the ${selectedIds.length} selected room layout(s)?`
                : `WARNING: Are you sure you want to delete ALL ${rooms.length} room layouts from room infrastructure? This action cannot be undone.`}
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
                  : 'Delete ALL Rooms'}
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
            <h3 className="text-sm font-bold text-slate-900">Delete Room?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this room layout?
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
                Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
