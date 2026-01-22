-- 員工代墊款系統資料表
-- 建立日期: 2026-01-22

-- =====================================================
-- 1. 主表：expense_reimbursement_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL, -- 申請單號（自動生成）

  -- 申請人資訊
  applicant_id UUID NOT NULL REFERENCES auth.users(id),
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department_id UUID REFERENCES public.departments(id),

  -- 金額統計
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_receipt_count INTEGER NOT NULL DEFAULT 0,
  brand_totals JSONB, -- 各品牌分別合計 {"六扇門": 10000, "粥大福": 5000}

  -- 撥款資訊
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')), -- 領現/匯款
  bank_name TEXT,
  bank_code TEXT,
  branch_name TEXT,
  branch_code TEXT,
  account_number TEXT,

  -- 狀態管理
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_ceo', 'pending_boss', 'pending_accountant', 'approved', 'rejected', 'cancelled')
  ),
  current_approver_id UUID REFERENCES auth.users(id),

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 軟刪除
  deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_expense_requests_applicant ON public.expense_reimbursement_requests(applicant_id);
CREATE INDEX idx_expense_requests_status ON public.expense_reimbursement_requests(status);
CREATE INDEX idx_expense_requests_current_approver ON public.expense_reimbursement_requests(current_approver_id);
CREATE INDEX idx_expense_requests_created_at ON public.expense_reimbursement_requests(created_at DESC);

-- 註釋
COMMENT ON TABLE public.expense_reimbursement_requests IS '員工代墊款申請主表';
COMMENT ON COLUMN public.expense_reimbursement_requests.request_number IS '申請單號（格式：ER-YYYYMMDD-XXXX）';
COMMENT ON COLUMN public.expense_reimbursement_requests.brand_totals IS '各品牌分別合計（JSON 格式）';
COMMENT ON COLUMN public.expense_reimbursement_requests.status IS '狀態：draft(草稿), pending_ceo(待總經理簽核), pending_boss(待放行主管簽核), pending_accountant(待審核主管簽核), approved(已核准), rejected(已駁回), cancelled(已取消)';

-- =====================================================
-- 2. 明細表：expense_reimbursement_items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_reimbursement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.expense_reimbursement_requests(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number >= 1 AND line_number <= 15),

  -- 費用明細
  category TEXT, -- 品項
  description TEXT, -- 內容
  amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- 申請金額
  receipt_count INTEGER NOT NULL DEFAULT 0, -- 發票/收據張數
  usage_note TEXT, -- 用途說明
  cost_allocation TEXT NOT NULL CHECK (cost_allocation IN ('六扇門', '粥大福')), -- 費用歸屬

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(request_id, line_number)
);

-- 索引
CREATE INDEX idx_expense_items_request ON public.expense_reimbursement_items(request_id);

-- 註釋
COMMENT ON TABLE public.expense_reimbursement_items IS '員工代墊款明細表（每筆申請最多 15 行）';
COMMENT ON COLUMN public.expense_reimbursement_items.line_number IS '行號（1-15）';
COMMENT ON COLUMN public.expense_reimbursement_items.cost_allocation IS '費用歸屬品牌';

-- =====================================================
-- 3. 簽核記錄表：expense_approvals
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.expense_reimbursement_requests(id) ON DELETE CASCADE,

  -- 簽核人資訊
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approval_type TEXT NOT NULL CHECK (approval_type IN ('ceo', 'boss', 'accountant')),
  approval_order INTEGER NOT NULL, -- 簽核順序

  -- 簽核狀態
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT, -- 簽核意見

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,

  UNIQUE(request_id, approval_order)
);

-- 索引
CREATE INDEX idx_expense_approvals_request ON public.expense_approvals(request_id);
CREATE INDEX idx_expense_approvals_approver ON public.expense_approvals(approver_id);
CREATE INDEX idx_expense_approvals_status ON public.expense_approvals(status);

-- 註釋
COMMENT ON TABLE public.expense_approvals IS '員工代墊款簽核記錄表';
COMMENT ON COLUMN public.expense_approvals.approval_type IS '簽核類型：ceo(總經理), boss(放行主管), accountant(審核主管)';

-- =====================================================
-- 4. 自動生成申請單號函數
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_expense_request_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  -- 取得今天日期 YYYYMMDD
  today := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- 查找今天的最大序號
  SELECT COALESCE(
    MAX(
      CASE
        WHEN request_number ~ ('^ER-' || today || '-[0-9]{4}$')
        THEN SUBSTRING(request_number FROM 16 FOR 4)::INTEGER
        ELSE 0
      END
    ), 0
  ) INTO seq_num
  FROM public.expense_reimbursement_requests
  WHERE request_number LIKE 'ER-' || today || '%';

  -- 序號 +1
  seq_num := seq_num + 1;

  -- 生成新單號（例如：ER-20260122-0001）
  new_number := 'ER-' || today || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN new_number;
END;
$$;

COMMENT ON FUNCTION public.generate_expense_request_number IS '自動生成員工代墊款申請單號（格式：ER-YYYYMMDD-XXXX）';

-- =====================================================
-- 5. 觸發器：自動生成單號
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_generate_expense_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := public.generate_expense_request_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_expense_request_number ON public.expense_reimbursement_requests;

CREATE TRIGGER before_insert_expense_request_number
  BEFORE INSERT ON public.expense_reimbursement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_expense_request_number();

-- =====================================================
-- 6. 觸發器：自動更新 updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_expense_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_expense_requests_updated_at ON public.expense_reimbursement_requests;
DROP TRIGGER IF EXISTS update_expense_items_updated_at ON public.expense_reimbursement_items;

CREATE TRIGGER update_expense_requests_updated_at
  BEFORE UPDATE ON public.expense_reimbursement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_updated_at();

CREATE TRIGGER update_expense_items_updated_at
  BEFORE UPDATE ON public.expense_reimbursement_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_expense_updated_at();

-- =====================================================
-- 7. RLS 政策（Row Level Security）
-- =====================================================

-- 啟用 RLS
ALTER TABLE public.expense_reimbursement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_reimbursement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;

-- 政策：申請人可以查看自己的申請
CREATE POLICY "Users can view their own expense requests"
  ON public.expense_reimbursement_requests
  FOR SELECT
  USING (auth.uid() = applicant_id);

-- 政策：申請人可以建立申請
CREATE POLICY "Users can create expense requests"
  ON public.expense_reimbursement_requests
  FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

-- 政策：申請人可以更新自己的草稿
CREATE POLICY "Users can update their own draft requests"
  ON public.expense_reimbursement_requests
  FOR UPDATE
  USING (auth.uid() = applicant_id AND status = 'draft');

-- 政策：簽核人可以查看待簽核的申請
CREATE POLICY "Approvers can view pending requests"
  ON public.expense_reimbursement_requests
  FOR SELECT
  USING (auth.uid() = current_approver_id);

-- 政策：明細表跟隨主表權限
CREATE POLICY "Users can view their own expense items"
  ON public.expense_reimbursement_items
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.expense_reimbursement_requests
      WHERE applicant_id = auth.uid() OR current_approver_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own expense items"
  ON public.expense_reimbursement_items
  FOR INSERT
  WITH CHECK (
    request_id IN (
      SELECT id FROM public.expense_reimbursement_requests
      WHERE applicant_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can update their own draft expense items"
  ON public.expense_reimbursement_items
  FOR UPDATE
  USING (
    request_id IN (
      SELECT id FROM public.expense_reimbursement_requests
      WHERE applicant_id = auth.uid() AND status = 'draft'
    )
  );

CREATE POLICY "Users can delete their own draft expense items"
  ON public.expense_reimbursement_items
  FOR DELETE
  USING (
    request_id IN (
      SELECT id FROM public.expense_reimbursement_requests
      WHERE applicant_id = auth.uid() AND status = 'draft'
    )
  );

-- 政策：簽核記錄
CREATE POLICY "Users can view approvals for their requests"
  ON public.expense_approvals
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.expense_reimbursement_requests
      WHERE applicant_id = auth.uid()
    ) OR approver_id = auth.uid()
  );

-- =====================================================
-- 8. 授權
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_reimbursement_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_reimbursement_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.expense_approvals TO authenticated;
