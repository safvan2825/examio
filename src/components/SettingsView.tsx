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
import { exportAllDataJSON, importAllDataJSON, saveAdminCredentials } from '../lib/realtime';
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
    if (window.confirm('Are you sure you want to PERMANENTLY delete ALL database records? This will delete all categories, classes, students, rooms, sessions, and seating arrangements.')) {
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

  const handleDownloadBackup = async () => {
    try {
      setImportStatus('Preparing backup...');
      const jsonStr = await exportAllDataJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NoorulHuda_ExamData_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus('Backup downloaded successfully.');
    } catch (err: any) {
      setImportStatus('Error creating backup: ' + err.message);
    }
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
        <p className="text-xs text-slate-500 mt-0.5">Configure board parameters, backup/restore Firebase databases, and quick manage modules.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => onNavigate('categories')} className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-500 text-left transition shadow-2xs group">
          <FolderTree className="w-5 h-5 text-emerald-600 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Manage Categories</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Secondary, Senior Secondary, Degree</p>
        </button>
        <button onClick={() => onNavigate('classes')} className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-500 text-left transition shadow-2xs group">
          <GraduationCap className="w-5 h-5 text-indigo-600 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Manage Classes</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Add or edit classes per category</p>
        </button>
        <button onClick={() => onNavigate('rooms')} className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-purple-500 text-left transition shadow-2xs group">
          <Grid className="w-5 h-5 text-purple-600 mb-2" />
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-600">Manage Rooms & Layouts</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Build Door & Window side matrices</p>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><KeyRound className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Admin Account Security</h3>
            <p className="text-xs text-slate-500">Update your portal login username and password. Changes take effect immediately.</p>
          </div>
        </div>
        {credsSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-emerald-600" /><span>{credsSuccess}</span></div>}
        {credsError && <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center"><AlertCircle className="w-4 h-4 mr-2 shrink-0 text-red-600" /><span>{credsError}</span></div>}
        <form onSubmit={handleUpdateCredentials} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Username</label><input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Current Password</label><div className="relative"><input type={showCurrentPass ? 'text' : 'password'} value={currentPasswordInput} onChange={(e) => setCurrentPasswordInput(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm pr-10" /><button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-2 top-2 text-slate-500">{showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label><div className="relative"><input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm pr-10" /><button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-2 top-2 text-slate-500">{showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <button type="submit" disabled={isSavingCreds} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{isSavingCreds ? 'Saving...' : 'Update Credentials'}</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-3"><Database className="w-5 h-5 text-slate-600" /><div><h3 className="text-sm font-bold text-slate-900">Database Management</h3><p className="text-xs text-slate-500">Backup and restore Examio data.</p></div></div>
        {importStatus && <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl">{importStatus}</div>}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleDownloadBackup} disabled={isImporting} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold disabled:opacity-50"><Download className="inline w-4 h-4 mr-2" />Download Backup</button>
          <label className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold cursor-pointer"><Upload className="inline w-4 h-4 mr-2" />Restore Backup<input type="file" accept="application/json" onChange={handleFileUpload} className="hidden" disabled={isImporting} /></label>
          <button onClick={handleClearAll} disabled={isImporting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"><Trash2 className="inline w-4 h-4 mr-2" />Clear All Data</button>
        </div>
      </div>
    </div>
  );
};
