-- =====================================================
-- 企業入口網與知識管理系統 (EIP & KM System)
-- =====================================================

-- 文件分類表
CREATE TABLE IF NOT EXISTS public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.document_categories(id) ON DELETE CASCADE,
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT 'blue',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 文件表
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[],
  author_id UUID REFERENCES public.profiles(id),
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 文件版本歷史表
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  changes_description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公告表
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'emergency', 'maintenance', 'event')),
  author_id UUID REFERENCES public.profiles(id),
  target_departments TEXT[],
  target_stores TEXT[],
  require_read_confirmation BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  attachments JSONB,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公告已讀記錄表
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 文件收藏表
CREATE TABLE IF NOT EXISTS public.document_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- =====================================================
-- 索引優化
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_author ON public.documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(published_at);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON public.announcement_reads(user_id);

-- =====================================================
-- RLS 政策
-- =====================================================

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_favorites ENABLE ROW LEVEL SECURITY;

-- 文件分類：所有認證用戶可讀
CREATE POLICY "Anyone can view active document categories"
  ON public.document_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 管理員可管理分類
CREATE POLICY "Admins can manage document categories"
  ON public.document_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- 文件：已發布的所有人可讀
CREATE POLICY "Anyone can view published documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (status = 'published');

-- 作者可管理自己的文件
CREATE POLICY "Authors can manage their documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (author_id = auth.uid());

-- 管理員可管理所有文件
CREATE POLICY "Admins can manage all documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- 公告：所有認證用戶可讀取活躍公告
CREATE POLICY "Anyone can view active announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 管理員可管理公告
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- 已讀記錄：用戶只能讀寫自己的記錄
CREATE POLICY "Users can manage their own read records"
  ON public.announcement_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- 收藏：用戶只能管理自己的收藏
CREATE POLICY "Users can manage their own favorites"
  ON public.document_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- RPC 函數
-- =====================================================

-- 標記公告為已讀
CREATE OR REPLACE FUNCTION mark_announcement_as_read(
  p_announcement_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, auth.uid())
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
END;
$$;

-- 獲取未讀公告數量
CREATE OR REPLACE FUNCTION get_unread_announcements_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM public.announcements a
  WHERE a.is_active = true
  AND a.published_at <= NOW()
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
  AND NOT EXISTS (
    SELECT 1 FROM public.announcement_reads ar
    WHERE ar.announcement_id = a.id
    AND ar.user_id = auth.uid()
  );

  RETURN unread_count;
END;
$$;

-- 增加文件瀏覽次數
CREATE OR REPLACE FUNCTION increment_document_view(
  p_document_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documents
  SET view_count = view_count + 1
  WHERE id = p_document_id;
END;
$$;

-- 增加文件下載次數
CREATE OR REPLACE FUNCTION increment_document_download(
  p_document_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documents
  SET download_count = download_count + 1
  WHERE id = p_document_id;
END;
$$;

-- =====================================================
-- 初始資料
-- =====================================================

-- 插入預設文件分類
INSERT INTO public.document_categories (name, description, icon, color, display_order) VALUES
  ('行政規章', '公司行政管理相關規章制度', 'Shield', 'blue', 1),
  ('作業 SOP', '各項作業標準流程', 'FileText', 'green', 2),
  ('表單下載', '各式表單下載專區', 'Download', 'amber', 3),
  ('教育訓練', '員工教育訓練資料', 'GraduationCap', 'purple', 4),
  ('人事規定', '人事相關規定與福利', 'Users', 'red', 5)
ON CONFLICT DO NOTHING;

-- 插入範例公告
INSERT INTO public.announcements (title, content, priority, type, require_read_confirmation) VALUES
  ('歡迎使用企業入口網系統', '本系統整合了所有企業內部資源，讓您更有效率地管理日常工作。', 'normal', 'general', false)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.document_categories IS '文件分類表';
COMMENT ON TABLE public.documents IS '文件表';
COMMENT ON TABLE public.document_versions IS '文件版本歷史表';
COMMENT ON TABLE public.announcements IS '公告表';
COMMENT ON TABLE public.announcement_reads IS '公告已讀記錄表';
COMMENT ON TABLE public.document_favorites IS '文件收藏表';
