import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, Layers, AlertCircle, Play } from 'lucide-react';
import { ExamSession, ClassItem, ClassSessionConfig } from '../types';

interface TimetableFolderViewProps {
  sessions: ExamSession[];
  classes: ClassItem[];
  onSaveSession: (session: ExamSession) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  onSelectSessionForGenerator: (sessionId: string) => void;
}

export const TimetableFolderView: React.FC<TimetableFolderViewProps> = ({
  sessions,
  classes,
  onSaveSession,
  onDeleteSession,
  onSelectSessionForGenerator,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);

  // Form
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedConfigs, setSelectedConfigs] = useState<ClassSessionConfig[]>([]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const classMap = new Map<string, ClassItem>();
  classes.forEach((c) => classMap.set(c.id, c));

  const handleOpenAdd = () => {
    setEditingSession(null);
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:30 AM');
    setEndTime('12:30 PM');
    // Pre-select all classes as Manual by default
    setSelectedConfigs(classes.map((c) => ({ classId: c.id, examMode: 'Manual' })));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sess: ExamSession) => {
    setEditingSession(sess);
    setDate(sess.date);
    if (sess.time && sess.time.includes('-')) {
      const parts = sess.time.split('-');
      setStartTime(parts[0].trim());
      setEndTime(parts[1].trim());
    } else {
      setStartTime(sess.time || '09:30 AM');
      setEndTime('12:30 PM');
    }
    setSelectedConfigs(sess.classConfigs || []);
    setIsModalOpen(true);
  };

  const toggleClassSelection = (classId: string) => {
    const exists = selectedConfigs.some((cfg) => cfg.classId === classId);
    if (exists) {
      setSelectedConfigs(selectedConfigs.filter((cfg) => cfg.classId !== classId));
    } else {
      setSelectedConfigs([...selectedConfigs, { classId, examMode: 'Manual' }]);
    }
  };

  const updateClassExamMode = (classId: string, examMode: 'Manual' | 'Online') => {
    setSelectedConfigs(
      selectedConfigs.map((cfg) => (cfg.classId === classId ? { ...cfg, examMode } : cfg))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime.trim() || !endTime.trim() || selectedConfigs.length === 0) return;

    const formattedTime = `${startTime.trim()} - ${endTime.trim()}`;
    const sessObj: ExamSession = {
      id: editingSession ? editingSession.id : `sess-${Date.now()}`,
      name: `${date} (${formattedTime})`,
      date,
      time: formattedTime,
      classConfigs: selectedConfigs,
      createdAt: editingSession ? editingSession.createdAt : new Date().toISOString(),
    };

    await onSaveSession(sessObj);
    setIsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await onDeleteSession(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Exam Timetable & Sessions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create timetable sessions, assign participating classes, and toggle Manual or Online exam modes.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sessions.map((sess) => (
          <div
            key={sess.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">{sess.date}</h3>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      {sess.time}
                    </span>
                  </div>
                </div>
              </div>

              {/* Participating Classes Tags */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 mb-2">
                  Participating Classes ({sess.classConfigs.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sess.classConfigs.map((cfg) => {
                    const cls = classMap.get(cfg.classId);
                    return (
                      <span
                        key={cfg.classId}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center border ${
                          cfg.examMode === 'Online'
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {cls ? cls.name : 'Class'}
                        <span className="ml-1 opacity-70">({cfg.examMode})</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onSelectSessionForGenerator(sess.id)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition"
              >
                <Play className="w-3 h-3 mr-1.5 fill-current text-emerald-400" />
                Generate Seating
              </button>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEdit(sess)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(sess.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900">
              {editingSession ? 'Edit Exam Session' : 'Create New Exam Session'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 09:30 AM"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="e.g. 12:30 PM"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Select Classes & Exam Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Participating Classes & Exam Mode *
                </label>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto bg-slate-50/50">
                  {classes.map((cls) => {
                    const cfgIndex = selectedConfigs.findIndex((c) => c.classId === cls.id);
                    const isSelected = cfgIndex >= 0;
                    const mode = isSelected ? selectedConfigs[cfgIndex].examMode : 'Manual';

                    return (
                      <div
                        key={cls.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-white border-emerald-300 shadow-2xs'
                            : 'bg-white/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <label className="flex items-center space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleClassSelection(cls.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-semibold text-slate-800">{cls.name}</span>
                        </label>

                        {isSelected && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => updateClassExamMode(cls.id, 'Manual')}
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                mode === 'Manual'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              Manual
                            </button>
                            <button
                              type="button"
                              onClick={() => updateClassExamMode(cls.id, 'Online')}
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                mode === 'Online'
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              Online
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                  disabled={selectedConfigs.length === 0}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-xs transition"
                >
                  {editingSession ? 'Save Changes' : 'Create Session'}
                </button>
              </div>
            </form>
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
            <h3 className="text-sm font-bold text-slate-900">Delete Exam Session?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this session timetable?
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
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
