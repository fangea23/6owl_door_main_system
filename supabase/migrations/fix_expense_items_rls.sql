-- =====================================================
-- 修正員工代墊款明細表 RLS 政策
-- 問題：送出申請時無法插入 items（狀態已不是 draft）
-- =====================================================

-- 刪除舊的 INSERT 政策
DROP POLICY IF EXISTS "Users can insert their own expense items" ON public.expense_reimbursement_items;

-- 新政策：允許用戶為自己的申請插入明細（不限狀態）
CREATE POLICY "Users can insert their own expense items"
  ON public.expense_reimbursement_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_reimbursement_requests
      WHERE id = expense_reimbursement_items.request_id
        AND applicant_id = auth.uid()
    )
  );

-- 註解
COMMENT ON POLICY "Users can insert their own expense items" ON public.expense_reimbursement_items IS
'允許用戶為自己的申請插入明細項目（不限申請狀態）';
