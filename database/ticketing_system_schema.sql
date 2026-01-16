-- =====================================================
-- 內部叫修/服務單系統 (Ticketing System)
-- =====================================================

-- 工單類別表
CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Tool',
  color TEXT DEFAULT 'blue',
  department TEXT, -- 負責部門 (e.g., '工務', 'IT', '總務')
  sla_hours INTEGER DEFAULT 24, -- 服務水準協議(小時)
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工單表
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL, -- 工單編號 (e.g., TK20260116001)
  category_id UUID REFERENCES public.ticket_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled')),

  -- 報修資訊
  reporter_id UUID REFERENCES public.profiles(id) NOT NULL,
  reporter_store_id UUID REFERENCES public.stores(id),
  reporter_department TEXT,
  reporter_phone TEXT,
  location TEXT, -- 具體位置

  -- 處理資訊
  assignee_id UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,

  -- SLA 追蹤
  due_at TIMESTAMP WITH TIME ZONE,
  is_overdue BOOLEAN DEFAULT false,

  -- 附件與照片
  attachments JSONB, -- [{url, name, type, size}]

  -- 評分
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  rated_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工單留言/更新表
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- 是否為內部備註(報修者看不到)
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工單狀態變更歷史
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL, -- 'created', 'assigned', 'status_changed', 'commented', 'rated'
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工單分派記錄
CREATE TABLE IF NOT EXISTS public.ticket_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id),
  to_user_id UUID REFERENCES public.profiles(id) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 索引優化
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_reporter ON public.tickets(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON public.tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_store ON public.tickets(reporter_store_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON public.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_due ON public.tickets(due_at);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON public.tickets(ticket_number);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created ON public.ticket_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON public.ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_created ON public.ticket_history(created_at);

-- =====================================================
-- RLS 政策
-- =====================================================

ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assignments ENABLE ROW LEVEL SECURITY;

-- 工單類別：所有認證用戶可讀
CREATE POLICY "Anyone can view active ticket categories"
  ON public.ticket_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 管理員可管理類別
CREATE POLICY "Admins can manage ticket categories"
  ON public.ticket_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- 工單：報修者、處理者、管理員可查看
CREATE POLICY "Users can view related tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- 任何認證用戶可建立工單
CREATE POLICY "Anyone can create tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- 報修者、處理者、管理員可更新工單
CREATE POLICY "Users can update related tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- 留言：相關人員可查看
CREATE POLICY "Users can view related comments"
  ON public.ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
      AND (
        t.reporter_id = auth.uid()
        OR t.assignee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'hr')
        )
      )
    )
    AND (
      NOT is_internal
      OR EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND (t.assignee_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'hr')
        ))
      )
    )
  );

-- 相關人員可新增留言
CREATE POLICY "Users can create comments on related tickets"
  ON public.ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
      AND (
        t.reporter_id = auth.uid()
        OR t.assignee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'hr')
        )
      )
    )
  );

-- 歷史記錄：相關人員可查看
CREATE POLICY "Users can view related history"
  ON public.ticket_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_history.ticket_id
      AND (
        t.reporter_id = auth.uid()
        OR t.assignee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'hr')
        )
      )
    )
  );

-- =====================================================
-- 觸發器：自動生成工單編號
-- =====================================================

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix TEXT;
  sequence_num INTEGER;
  new_ticket_number TEXT;
BEGIN
  -- 格式: TK + YYYYMMDD + 序號 (e.g., TK20260116001)
  date_prefix := 'TK' || TO_CHAR(NEW.created_at, 'YYYYMMDD');

  -- 取得當日最大序號
  SELECT COALESCE(MAX(SUBSTRING(ticket_number FROM 11)::INTEGER), 0) + 1
  INTO sequence_num
  FROM public.tickets
  WHERE ticket_number LIKE date_prefix || '%';

  -- 組合工單編號
  new_ticket_number := date_prefix || LPAD(sequence_num::TEXT, 3, '0');

  NEW.ticket_number := new_ticket_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_ticket_number();

-- =====================================================
-- 觸發器：記錄工單歷史
-- =====================================================

CREATE OR REPLACE FUNCTION log_ticket_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_history (ticket_id, user_id, action, new_value, description)
    VALUES (NEW.id, NEW.reporter_id, 'created', NEW.status, '工單已建立');
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 狀態變更
    IF OLD.status != NEW.status THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status, '狀態變更');
    END IF;

    -- 指派變更
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'assigned', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT, '指派處理人員');
    END IF;

    -- 優先度變更
    IF OLD.priority != NEW.priority THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority, '優先度變更');
    END IF;

    -- 評分
    IF OLD.rating IS NULL AND NEW.rating IS NOT NULL THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, new_value, description)
      VALUES (NEW.id, NEW.reporter_id, 'rated', NEW.rating::TEXT, '服務評分');
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_ticket_changes
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_history();

-- =====================================================
-- 觸發器：更新 SLA 狀態
-- =====================================================

CREATE OR REPLACE FUNCTION update_ticket_sla()
RETURNS TRIGGER AS $$
BEGIN
  -- 計算到期時間
  IF NEW.due_at IS NULL AND NEW.category_id IS NOT NULL THEN
    SELECT created_at + (sla_hours || ' hours')::INTERVAL
    INTO NEW.due_at
    FROM public.ticket_categories
    WHERE id = NEW.category_id;
  END IF;

  -- 檢查是否逾期
  IF NEW.due_at IS NOT NULL AND NOW() > NEW.due_at AND NEW.status NOT IN ('resolved', 'closed', 'cancelled') THEN
    NEW.is_overdue := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_ticket_sla
  BEFORE INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_sla();

-- =====================================================
-- RPC 函數
-- =====================================================

-- 指派工單
CREATE OR REPLACE FUNCTION assign_ticket(
  p_ticket_id UUID,
  p_assignee_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_assignee UUID;
BEGIN
  -- 取得舊的處理者
  SELECT assignee_id INTO v_old_assignee
  FROM public.tickets
  WHERE id = p_ticket_id;

  -- 更新工單
  UPDATE public.tickets
  SET
    assignee_id = p_assignee_id,
    assigned_at = NOW(),
    status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END,
    updated_at = NOW()
  WHERE id = p_ticket_id;

  -- 記錄分派歷史
  INSERT INTO public.ticket_assignments (ticket_id, from_user_id, to_user_id, reason)
  VALUES (p_ticket_id, v_old_assignee, p_assignee_id, p_reason);
END;
$$;

-- 取得工單統計
CREATE OR REPLACE FUNCTION get_ticket_statistics(
  p_user_id UUID DEFAULT NULL,
  p_store_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE(
  total_tickets BIGINT,
  open_tickets BIGINT,
  in_progress_tickets BIGINT,
  resolved_tickets BIGINT,
  closed_tickets BIGINT,
  overdue_tickets BIGINT,
  avg_resolution_hours NUMERIC,
  avg_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tickets,
    COUNT(*) FILTER (WHERE status = 'open')::BIGINT as open_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT as in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT as resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'closed')::BIGINT as closed_tickets,
    COUNT(*) FILTER (WHERE is_overdue = true)::BIGINT as overdue_tickets,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::NUMERIC as avg_resolution_hours,
    AVG(rating)::NUMERIC as avg_rating
  FROM public.tickets
  WHERE
    (p_user_id IS NULL OR reporter_id = p_user_id OR assignee_id = p_user_id)
    AND (p_store_id IS NULL OR reporter_store_id = p_store_id)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;

-- =====================================================
-- 初始資料
-- =====================================================

-- 插入預設工單類別
INSERT INTO public.ticket_categories (name, description, icon, color, department, sla_hours, display_order) VALUES
  ('設備維修', 'POS機、冷氣、冰箱等設備故障', 'Tool', 'blue', '工務部', 24, 1),
  ('IT 支援', '電腦、網路、系統問題', 'Monitor', 'purple', 'IT部', 12, 2),
  ('水電維修', '水管、電路、照明問題', 'Zap', 'amber', '工務部', 24, 3),
  ('清潔維護', '環境清潔、垃圾處理', 'Sparkles', 'green', '總務部', 48, 4),
  ('其他服務', '其他類型的服務需求', 'MoreHorizontal', 'stone', '總務部', 48, 5)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.ticket_categories IS '工單類別表';
COMMENT ON TABLE public.tickets IS '工單表';
COMMENT ON TABLE public.ticket_comments IS '工單留言/更新表';
COMMENT ON TABLE public.ticket_history IS '工單狀態變更歷史';
COMMENT ON TABLE public.ticket_assignments IS '工單分派記錄';
