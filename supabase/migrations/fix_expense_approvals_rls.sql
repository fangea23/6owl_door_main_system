-- 修正 expense_approvals 表的 RLS 政策
-- 建立日期: 2026-01-22
-- 問題：缺少 INSERT 政策，導致簽核人無法建立簽核記錄

-- 新增：簽核人可以插入自己的簽核記錄
CREATE POLICY "Approvers can insert their own approvals"
  ON public.expense_approvals
  FOR INSERT
  WITH CHECK (
    auth.uid() = approver_id
    AND request_id IN (
      SELECT id FROM public.expense_reimbursement_requests
      WHERE current_approver_id = auth.uid()
        AND status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager')
    )
  );

-- 新增：簽核人可以更新自己的簽核記錄（修改意見或狀態）
CREATE POLICY "Approvers can update their own approvals"
  ON public.expense_approvals
  FOR UPDATE
  USING (auth.uid() = approver_id)
  WITH CHECK (auth.uid() = approver_id);

COMMENT ON POLICY "Approvers can insert their own approvals" ON public.expense_approvals
  IS '簽核人可以為待簽核的申請插入自己的簽核記錄';

COMMENT ON POLICY "Approvers can update their own approvals" ON public.expense_approvals
  IS '簽核人可以更新自己的簽核記錄（修改意見或狀態）';
