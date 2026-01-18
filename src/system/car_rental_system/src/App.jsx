import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { RentalRequests } from './pages/RentalRequests';
import { MyRentals } from './pages/MyRentals';
import { RequestForm } from './pages/RequestForm';
import { RentalsList } from './pages/RentalsList'; // 👈 引入新頁面
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="requests" element={<RentalRequests />} />
        <Route path="requests/new" element={<RequestForm />} />
        <Route path="my-rentals" element={<MyRentals />} />
        <Route path="rentals" element={<RentalsList />} />
      </Route>
    </Routes>
  );
}

export default App;
