import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BookingForm from './pages/BookingForm';
import RoomManagement from './pages/RoomManagement';
import './App.css';

const BASE_PATH = '/systems/meeting-room';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="booking" element={<BookingForm />} />
          <Route path="booking/:id" element={<BookingForm />} />
          <Route path="rooms" element={<RoomManagement />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
