import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/Landing/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import TeamMembersPage from './pages/TeamMembers/TeamMembersPage';
import ProjectsPage from './pages/Projects/ProjectsPage';
import ProjectManagementPage from './pages/Projects/ProjectManagementPage';
import ProjectCreationPage from './pages/Projects/ProjectCreationPage';
import CapacityPlanningPage from './pages/Capacity/CapacityPlanningPage';
import TimesheetsPage from './pages/Timesheets/TimesheetsPage';
import LeavePage from './pages/Leave/LeavePage';
import ReportsPage from './pages/Reports/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ClientsPage from './pages/Clients/ClientsPage';
import ExpensesPage from './pages/Expenses/ExpensesPage';
import InvoicePage from './pages/Invoices/InvoicePage';
import EstimatePage from './pages/Estimates/EstimatePage';
import StoragePage from './pages/Storage/StoragePage';
import { useAuthStore } from './store/authStore';
import { canAccessRoute } from './lib/permissions';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/" element={<AppLayout />}>
          {/* Auth routes */}
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignUpPage />} />
          
          {/* Protected routes */}
          <Route path="dashboard" element={
            <ProtectedRoute path="/dashboard">
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="employees" element={
            <ProtectedRoute path="/employees">
              <TeamMembersPage />
            </ProtectedRoute>
          } />
          
          <Route path="projects" element={
            <ProtectedRoute path="/projects">
              <ProjectsPage />
            </ProtectedRoute>
          } />
          
          <Route path="projects/new" element={
            <ProtectedRoute path="/projects/new">
              <ProjectCreationPage />
            </ProtectedRoute>
          } />
          
          <Route path="projects/management" element={
            <ProtectedRoute path="/projects/management">
              <ProjectManagementPage />
            </ProtectedRoute>
          } />
          
          <Route path="capacity" element={
            <ProtectedRoute path="/capacity">
              <CapacityPlanningPage />
            </ProtectedRoute>
          } />
          
          <Route path="timesheets" element={
            <ProtectedRoute path="/timesheets">
              <TimesheetsPage />
            </ProtectedRoute>
          } />
          
          <Route path="leave" element={
            <ProtectedRoute path="/leave">
              <LeavePage />
            </ProtectedRoute>
          } />
          
          <Route path="clients" element={
            <ProtectedRoute path="/clients">
              <ClientsPage />
            </ProtectedRoute>
          } />
          
          <Route path="expenses" element={
            <ProtectedRoute path="/expenses">
              <ExpensesPage />
            </ProtectedRoute>
          } />
          
          <Route path="estimates" element={
            <ProtectedRoute path="/estimates">
              <EstimatePage />
            </ProtectedRoute>
          } />
          
          <Route path="invoices" element={
            <ProtectedRoute path="/invoices">
              <InvoicePage />
            </ProtectedRoute>
          } />
          
          <Route path="storage" element={
            <ProtectedRoute path="/storage">
              <StoragePage />
            </ProtectedRoute>
          } />
          
          <Route path="reports" element={
            <ProtectedRoute path="/reports">
              <ReportsPage />
            </ProtectedRoute>
          } />
          
          <Route path="settings" element={
            <ProtectedRoute path="/settings">
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;