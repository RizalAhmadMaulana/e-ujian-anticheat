import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useExamStore } from './store/useExamStore';

// Guards & Layouts
import RoleRouteGuard from './components/guards/RoleRouteGuard';
import TeacherLayout from './layouts/TeacherLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';

// Teacher Pages
import DashboardTeacher from './pages/teacher/DashboardTeacher';
import ClassroomManagement from './pages/teacher/ClassroomManagement';
import TeacherManagement from './pages/teacher/TeacherManagement';
import StudentManagement from './pages/teacher/StudentManagement';
import UserManagement from './pages/teacher/UserManagement';
import ExamPackageList from './pages/teacher/ExamPackageList';
import ExamSessionSetup from './pages/teacher/ExamSessionSetup';
import LiveProctoring from './pages/teacher/LiveProctoring';
import EJournalReport from './pages/teacher/EJournalReport';
import SchoolSettings from './pages/teacher/SchoolSettings';

// Student Pages
import GatekeeperPin from './pages/student/GatekeeperPin';
import StudentLobby from './pages/student/StudentLobby';
import SubjectPortal from './pages/student/SubjectPortal';
import ExamWorkspace from './pages/student/ExamWorkspace';

export default function App() {
  const { currentUser, isAuthenticated } = useExamStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman Autentikasi Publik */}
        <Route path="/login" element={<LoginPage />} />

        {/* Redirect Root Berdasarkan Sesi Pengguna */}
        <Route
          path="/"
          element={
            isAuthenticated && currentUser ? (
              currentUser.role === 'TEACHER' ? (
                <Navigate to="/teacher/dashboard" replace />
              ) : (
                <Navigate to="/student/lobby" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Portal Guru (Role: TEACHER) */}
        <Route
          path="/teacher"
          element={
            <RoleRouteGuard allowedRoles={['TEACHER']}>
              <TeacherLayout />
            </RoleRouteGuard>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardTeacher />} />
          <Route path="classrooms" element={<ClassroomManagement />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="packages" element={<ExamPackageList />} />
          <Route path="sessions" element={<ExamSessionSetup />} />
          <Route path="proctoring" element={<LiveProctoring />} />
          <Route path="ejournal" element={<EJournalReport />} />
          <Route path="settings" element={<SchoolSettings />} />
        </Route>

        {/* Portal Siswa (Role: STUDENT) */}
        <Route
          path="/student"
          element={
            <RoleRouteGuard allowedRoles={['STUDENT']}>
              <Navigate to="/student/lobby" replace />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/student/gatekeeper"
          element={
            <RoleRouteGuard allowedRoles={['STUDENT']}>
              <GatekeeperPin />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/student/lobby"
          element={
            <RoleRouteGuard allowedRoles={['STUDENT']}>
              <StudentLobby />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/student/subjects"
          element={
            <RoleRouteGuard allowedRoles={['STUDENT']}>
              <SubjectPortal />
            </RoleRouteGuard>
          }
        />
        <Route
          path="/student/exam-workspace"
          element={
            <RoleRouteGuard allowedRoles={['STUDENT']}>
              <ExamWorkspace />
            </RoleRouteGuard>
          }
        />

        {/* Fallback Not Found */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

