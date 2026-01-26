-- =====================================================
-- 修正員工代墊款系統 RLS 政策 - 允許簽核人更新申請狀態
-- 建立日期: 2026-01-22
-- 問題：簽核人無法更新申請狀態（從 pending_boss → pending_audit_manager）
--       因為現有的 UPDATE 政策只允許申請人更新草稿
-- =====================================================

-- 新增：簽核人可以更新待簽核的申請（更新狀態、簽核人等）
-- 註：此政策配合前端 RBAC 權限檢查和簽核記錄的 RLS 保護
--     只有真正有權限的簽核人才能插入 approval 記錄並執行更新
CREATE POLICY "Approvers can update pending requests"
  ON public.expense_reimbursement_requests
  FOR UPDATE
  USING (
    -- 當前狀態是待簽核狀態
    status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager')
    -- 確保是已認證用戶
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    -- 更新後狀態可以是：下一個待簽核狀態、已核准、或已駁回
    status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager', 'approved', 'rejected')
  );

COMMENT ON POLICY "Approvers can update pending requests" ON public.expense_reimbursement_requests IS
'允許已認證用戶更新待簽核的申請狀態（推進簽核流程或駁回）。配合前端 RBAC 權限檢查和簽核記錄保護。';
