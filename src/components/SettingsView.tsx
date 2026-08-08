import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  FolderTree,
  GraduationCap,
  Grid,
  AlertCircle,
  CheckCircle2,
  Trash2,
  KeyRound,
  User,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { exportAllDataJSON, importAllDataJSON, saveAdminCredentials } from '../lib/firebase';
import { AdminCredentials } from '../types';

interface SettingsViewProps {
  adminCredentials?: AdminCredentials;
  onSeedDemoData: () => Promise<void>;
  onClearAllData: () => Promise<void>;
  onNavigate: (tab: any) => void;
  onDataRestored: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  adminCredentials = { username: 'nhexam', password: 'exam2026' },
  onSeedDemoData,
  onClearAllData,
  onNavigate,
  onDataRestored,
}) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Admin Credentials form state
  const [newUsername, setNewUsername] = useState<string>(adminCredentials.username);
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [credsSuccess, setCredsSuccess] = useState<string>('');
  const [credsError, setCredsError] = useState<string>('');
  const [isSavingCreds, setIsSavingCreds] = useState<boolean>(false);

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsSuccess('');
    setCredsError('');

    if (!newUsername.trim()) {
      setCredsError('Username cannot be empty.');
      return;
    }

    if (currentPasswordInput !== adminCredentials.password) {
      setCredsError('Current password is incorrect.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setCredsError('New password must be at least 4 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setCredsError('New passwords do not match.');
        return;
      }
    }

    setIsSavingCreds(true);
    try {
      const updatedCreds: AdminCredentials = {
        username: newUsername.trim(),
        password: newPassword ? newPassword : adminCredentials.password,
      };

      await saveAdminCredentials(updatedCreds);
      setCredsSuccess('Username and password updated successfully!');
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setCredsError('Error updating credentials: ' + err.message);
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        'Are you sure you want to PERMANENTLY delete ALL database records? This will delete all categories, classes, students, rooms, sessions, and seating arrangements.'
      )
    ) {
      setIsImporting(true);
      setImportStatus('Clearing all database records...');
      try {
        await onClearAllData();
        setImportStatus('All database records have been permanently cleared.');
      } catch (err: any) {
        setImportStatus('Error clearing data: ' + err.message);
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NoorulHuda_ExamData_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Restoring database from backup file...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        await importAllDataJSON(content);
        setImportStatus('Data backup successfully restored!');
        onDataRestored();
      } catch (err: any) {
        setImportStatus('Error restoring data: ' + err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">Application Settings & Data Management</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure board parameters, backup/restore Firebase databases, and quick manage modules.
        </p>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('categories')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-500 text-left transition shadow-2xs group"
        >
          <FolderTree className="w-5 h-5 text-emerald-600 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
            Manage Categories
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Secondary, Senior Secondary, Degree
          </p>
        </button>

        <button
          onClick={() => onNavigate('classes')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-500 text-left transition shadow-2xs group"
        >
          <GraduationCap className="w-5 h-5 text-indigo-600 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
            Manage Classes
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Add or edit classes per category
          </p>
        </button>

        <button
          onClick={() => onNavigate('rooms')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-purple-500 text-left transition shadow-2xs group"
        >
          <Grid className="w-5 h-5 text-purple-600 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-600">
            Manage Rooms & Layouts
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Build Door & Window side matrices
          </p>
        </button>
      </div>

      {/* Account & Security Credentials */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Admin Account Security</h3>
            <p className="text-xs text-slate-500">
              Update your portal login username and password. Changes take effect immediately.
            </p>
          </div>
        </div>

        {credsSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
            <span>{credsSuccess}</span>
          </div>
        )}

        {credsError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-rose-600" />
            <span>{credsError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Verify current password"
                  className="w-full text-xs pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full text-xs pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type={showNewPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingCreds}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center transition disabled:opacity-50"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {isSavingCreds ? 'Saving Changes...' : 'Save New Credentials'}
            </button>
          </div>
        </form>
      </div>

      {/* Backup and Restore Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Database Backup & Restore</h3>
            <p className="text-xs text-slate-500">
              Export all categories, classes, students, rooms, and seating plans as a JSON backup file.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center transition"
          >
            <Download className="w-4 h-4 mr-2 text-emerald-400" />
            Download Data Backup (JSON)
          </button>

          <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 flex items-center justify-center transition cursor-pointer">
            <Upload className="w-4 h-4 mr-2 text-blue-600" />
            Restore from Backup File
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleClearAll}
            disabled={isImporting}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold rounded-xl flex items-center justify-center transition"
          >
            <Trash2 className="w-4 h-4 mr-2 text-rose-600" />
            Delete All Data
          </button>
        </div>

        {importStatus && (
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
            {importStatus}
          </p>
        )}
      </div>

      {/* Board Information Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs border border-slate-800">
        <div className="flex items-center space-x-3 mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold">Noorul Huda Examination Board</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          All changes are synchronized permanently across Firebase Firestore and locally cached in browser memory to prevent data loss.
        </p>
      </div>
    </div>
  );
};
