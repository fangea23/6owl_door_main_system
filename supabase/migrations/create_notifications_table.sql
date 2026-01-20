-- 創建通知表
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('approval', 'system', 'alert')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 創建索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;

-- 創建自動更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 啟用 Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 創建 RLS 策略：用戶只能查看自己的通知
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- 創建 RLS 策略：用戶只能更新自己的通知
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 創建 RLS 策略：用戶只能刪除自己的通知
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- 創建 RLS 策略：系統可以插入通知（需要 service_role 權限）
CREATE POLICY "System can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- 啟用 Realtime (用於實時通知推送)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 註解
COMMENT ON TABLE public.notifications IS '用戶通知表，儲存系統通知、簽核通知等';
COMMENT ON COLUMN public.notifications.id IS '通知 ID';
COMMENT ON COLUMN public.notifications.user_id IS '接收通知的用戶 ID';
COMMENT ON COLUMN public.notifications.title IS '通知標題';
COMMENT ON COLUMN public.notifications.message IS '通知內容';
COMMENT ON COLUMN public.notifications.type IS '通知類型：approval（簽核）、system（系統）、alert（警告）';
COMMENT ON COLUMN public.notifications.is_read IS '是否已讀';
COMMENT ON COLUMN public.notifications.created_at IS '創建時間';
COMMENT ON COLUMN public.notifications.updated_at IS '更新時間';
