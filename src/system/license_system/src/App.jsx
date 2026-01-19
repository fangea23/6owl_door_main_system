import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard, Licenses, Assignments, Software, VerifyLicense, Devices } from './pages';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="licenses" element={<Licenses />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="devices" element={<Devices />} />
        <Route path="software" element={<Software />} />
      </Route>
    </Routes>
  );
}
export default App;
