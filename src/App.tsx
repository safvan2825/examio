import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CategoriesView } from './components/CategoriesView';
import { ClassesView } from './components/ClassesView';
import { StudentsView } from './components/StudentsView';
import { RoomsView } from './components/RoomsView';
import { TimetableFolderView } from './components/TimetableFolderView';
import { SeatingGeneratorView } from './components/SeatingGeneratorView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { PrintModalView } from './components/PrintModalView';
import { LoginView } from './components/LoginView';

import {
  subscribeCategories,
  subscribeClasses,
  subscribeStudents,
  subscribeRooms,
  subscribeSessions,
  subscribeSeatingArrangements,
  subscribeAdminCredentials,
  DEFAULT_CREDENTIALS,
  saveCategory,
  deleteCategory,
  deleteBulkCategories,
  saveClassItem,
  saveBulkClasses,
  deleteClassItem,
  deleteBulkClasses,
  saveStudent,
  saveBulkStudents,
  deleteStudent,
  deleteBulkStudents,
  saveRoom,
  deleteRoom,
  deleteBulkRooms,
  saveSession,
  deleteSession,
  saveSeatingArrangement,
  seedSampleData,
  clearAllData,
} from './lib/realtime';

import {
  Category,
  ClassItem,
  Student,
  Room,
  ExamSession,
  SeatingArrangement,
  AdminCredentials,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(DEFAULT_CREDENTIALS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem('nh_authenticated') === 'true'
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [seatingArrangements, setSeatingArrangements] = useState<SeatingArrangement[]>([]);

  const [selectedGeneratorSessionId, setSelectedGeneratorSessionId] = useState<string>('');

  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    type: 'roomDiagram' | 'studentList';
    session?: ExamSession;
    arrangement?: SeatingArrangement;
  }>({ isOpen: false, type: 'roomDiagram' });

  useEffect(() => {
    const unsubCreds = subscribeAdminCredentials((creds) => setAdminCredentials(creds));
    return () => unsubCreds();
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem('nh_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('nh_authenticated');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const unsubCat = subscribeCategories(setCategories);
    const unsubCls = subscribeClasses(setClasses);
    const unsubSt = subscribeStudents(setStudents);
    const unsubRm = subscribeRooms(setRooms);
    const unsubSess = subscribeSessions(setSessions);
    const unsubSeat = subscribeSeatingArrangements(setSeatingArrangements);

    return () => {
      unsubCat();
      unsubCls();
      unsubSt();
      unsubRm();
      unsubSess();
      unsubSeat();
    };
  }, []);

  // Firebase loads sessions asynchronously. Keep the generator synchronized with
  // the first available session instead of leaving it stuck on an empty selection.
  useEffect(() => {
    if (!selectedGeneratorSessionId && sessions.length > 0) {
      setSelectedGeneratorSessionId(sessions[0].id);
    } else if (
      selectedGeneratorSessionId &&
      sessions.length > 0 &&
      !sessions.some((s) => s.id === selectedGeneratorSessionId)
    ) {
      setSelectedGeneratorSessionId(sessions[0].id);
    }
  }, [sessions, selectedGeneratorSessionId]);

  const handleSelectSessionForGenerator = (sessionId: string) => {
    setSelectedGeneratorSessionId(sessionId);
    setActiveTab('generator');
  };

  const handleOpenPrintModal = (
    type: 'roomDiagram' | 'studentList',
    session: ExamSession,
    arrangement: SeatingArrangement
  ) => {
    setPrintModalState({ isOpen: true, type, session, arrangement });
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        adminCredentials={adminCredentials}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex selection:bg-blue-600 selection:text-white">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

      <main className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            categories={categories}
            classes={classes}
            students={students}
            rooms={rooms}
            sessions={sessions}
            onNavigate={setActiveTab}
            onSelectSessionForGenerator={handleSelectSessionForGenerator}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            classes={classes}
            rooms={rooms}
            onSaveCategory={saveCategory}
            onDeleteCategory={deleteCategory}
            onDeleteBulkCategories={deleteBulkCategories}
          />
        )}

        {activeTab === 'classes' && (
          <ClassesView
            categories={categories}
            classes={classes}
            students={students}
            onSaveClassItem={saveClassItem}
            onSaveBulkClasses={saveBulkClasses}
            onDeleteClassItem={deleteClassItem}
            onDeleteBulkClasses={deleteBulkClasses}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            students={students}
            classes={classes}
            onSaveStudent={saveStudent}
            onSaveBulkStudents={saveBulkStudents}
            onDeleteStudent={deleteStudent}
            onDeleteBulkStudents={deleteBulkStudents}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsView
            rooms={rooms}
            categories={categories}
            onSaveRoom={saveRoom}
            onDeleteRoom={deleteRoom}
            onDeleteBulkRooms={deleteBulkRooms}
          />
        )}

        {activeTab === 'timetable' && (
          <TimetableFolderView
            sessions={sessions}
            classes={classes}
            onSaveSession={saveSession}
            onDeleteSession={deleteSession}
            onSelectSessionForGenerator={handleSelectSessionForGenerator}
          />
        )}

        {activeTab === 'generator' && (
          <SeatingGeneratorView
            sessions={sessions}
            students={students}
            classes={classes}
            categories={categories}
            rooms={rooms}
            arrangements={seatingArrangements}
            selectedSessionIdFromNav={selectedGeneratorSessionId || sessions[0]?.id || ''}
            onSaveArrangement={saveSeatingArrangement}
            onOpenPrintModal={handleOpenPrintModal}
          />
        )}

        {activeTab === 'search' && (
          <SearchView
            students={students}
            classes={classes}
            categories={categories}
            rooms={rooms}
            sessions={sessions}
            arrangements={seatingArrangements}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            adminCredentials={adminCredentials}
            onSeedDemoData={seedSampleData}
            onClearAllData={clearAllData}
            onNavigate={setActiveTab}
            onDataRestored={() => {}}
          />
        )}
      </main>

      {printModalState.isOpen && printModalState.session && printModalState.arrangement && (
        <PrintModalView
          type={printModalState.type}
          session={printModalState.session}
          arrangement={printModalState.arrangement}
          categories={categories}
          classes={classes}
          onClose={() => setPrintModalState({ ...printModalState, isOpen: false })}
        />
      )}
    </div>
  );
}
