-- 修正 expense_approvals 表的 RLS 政策
-- 建立日期: 2026-01-22
-- 問題：缺少 INSERT 政策，導致簽核人無法建立簽核記錄
--
-- 註解：由於簽核流程中先更新 request 狀態（將 current_approver_id 設為 NULL），
--       再插入 approval 記錄，因此 INSERT 政策不能依賴 current_approver_id。
--       改為檢查 approver_id 是當前用戶，並且 request 存在即可。

-- 新增：簽核人可以插入自己的簽核記錄
CREATE POLICY "Approvers can insert their own approvals"
  ON public.expense_approvals
  FOR INSERT
  WITH CHECK (
    auth.uid() = approver_id
    AND EXISTS (
      SELECT 1 FROM public.expense_reimbursement_requests
      WHERE id = expense_approvals.request_id
    )
  );

-- 新增：簽核人可以更新自己的簽核記錄（修改意見或狀態）
CREATE POLICY "Approvers can update their own approvals"
  ON public.expense_approvals
  FOR UPDATE
  USING (auth.uid() = approver_id)
  WITH CHECK (auth.uid() = approver_id);

COMMENT ON POLICY "Approvers can insert their own approvals" ON public.expense_approvals
  IS '簽核人可以插入自己的簽核記錄（只要 approver_id 是自己）';

COMMENT ON POLICY "Approvers can update their own approvals" ON public.expense_approvals
  IS '簽核人可以更新自己的簽核記錄（修改意見或狀態）';
