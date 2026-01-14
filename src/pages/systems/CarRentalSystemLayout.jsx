import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CarRentalApp from '../../system/car_rental_system/src/App';

/**
 * 公司車租借系統入口
 * 負責將主系統路由轉發到子系統
 */
export default function CarRentalSystemLayout() {
  return (
    <Routes>
      <Route path="/*" element={<CarRentalApp />} />
    </Routes>
  );
}
