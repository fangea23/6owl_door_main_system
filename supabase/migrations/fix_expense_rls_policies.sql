-- =====================================================
-- 修正員工代墊款系統 RLS 政策
-- 問題：UPDATE 政策太嚴格，導致送出申請時失敗
-- =====================================================

-- 刪除舊的 UPDATE 政策
DROP POLICY IF EXISTS "Users can update their own draft requests" ON public.expense_reimbursement_requests;

-- 新政策：申請人可以更新自己的申請
CREATE POLICY "Users can update their own requests"
  ON public.expense_reimbursement_requests
  FOR UPDATE
  USING (
    auth.uid() = applicant_id AND
    -- 只允許更新草稿狀態的申請（更新前狀態必須是 draft）
    status = 'draft'
  )
  WITH CHECK (
    auth.uid() = applicant_id
    -- 更新後：可以是任何狀態（draft, pending_xxx, cancelled）
  );

-- 註解
COMMENT ON POLICY "Users can update their own requests" ON public.expense_reimbursement_requests IS
'允許用戶更新自己的草稿申請，包含送出（更新狀態為 pending_xxx）';
