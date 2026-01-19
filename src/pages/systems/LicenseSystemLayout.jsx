import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LicenseApp from '../../system/license_system/src/App';

/**
 * 軟體授權系統入口
 * 負責將主系統路由轉發到子系統 (LicenseApp)
 * 子系統內部的 App.jsx 會接手處理所有的 /dashboard, /licenses 等路由
 */
export default function LicenseSystemLayout() {
  return (
    <Routes>
      <Route path="/*" element={<LicenseApp />} />
    </Routes>
  );
}
