import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import AdminDashboard from './components/dashboard/AdminDashboard';
import DoctorDashboard from './components/dashboard/DoctorDashboard';
import StaffDashboard from './components/dashboard/StaffDashboard';
import PatientDashboard from './components/dashboard/PatientDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

const DashboardRouter = () => {
  const { user } = useAuth();
  
  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'patient':
      return <PatientDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default App;