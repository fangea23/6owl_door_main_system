-- ============================================================================
-- 簡化版：檢查資料庫中所有引用 accountant_brands 的物件
-- ============================================================================

-- 1. 檢查 accountant_brands 表的實際位置
SELECT
    schemaname as "Schema",
    tablename as "Table Name"
FROM pg_tables
WHERE tablename = 'accountant_brands';

-- ============================================================================

-- 2. 檢查所有 VIEWS 中是否有錯誤引用
SELECT
    schemaname as "Schema",
    viewname as "View Name",
    CASE
        WHEN definition ILIKE '%payment_approval.accountant_brands%' THEN '❌ 錯誤 - 使用 payment_approval schema'
        WHEN definition ILIKE '%public.accountant_brands%' THEN '✅ 正確 - 使用 public schema'
        ELSE '⚠️  未明確指定 schema'
    END as "Status"
FROM pg_views
WHERE definition ILIKE '%accountant_brands%'
ORDER BY schemaname, viewname;

-- ============================================================================

-- 3. 檢查所有 FUNCTIONS 和 TRIGGERS（使用 prosrc 而非 pg_get_functiondef）
SELECT
    n.nspname as "Schema",
    p.proname as "Function Name",
    CASE p.prokind
        WHEN 'f' THEN 'Function'
        WHEN 'p' THEN 'Procedure'
        WHEN 'a' THEN 'Aggregate'
        WHEN 'w' THEN 'Window'
    END as "Type",
    CASE
        WHEN p.prosrc ILIKE '%payment_approval.accountant_brands%' THEN '❌ 錯誤 - 使用 payment_approval schema'
        WHEN p.prosrc ILIKE '%public.accountant_brands%' THEN '✅ 正確 - 使用 public schema'
        ELSE '⚠️  未明確指定 schema'
    END as "Status"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%accountant_brands%'
  AND p.prokind IN ('f', 'p')  -- 只查詢 functions 和 procedures，排除 aggregates
ORDER BY n.nspname, p.proname;

-- ============================================================================

-- 4. 列出所有引用 accountant_brands 的 TRIGGERS
SELECT
    t.tgname as "Trigger Name",
    n.nspname as "Table Schema",
    c.relname as "Table Name",
    p.proname as "Function Name"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.prosrc ILIKE '%accountant_brands%'
ORDER BY n.nspname, c.relname, t.tgname;

-- ============================================================================

-- 5. 快速檢查：列出所有包含錯誤引用的物件
SELECT
    '❌ VIEW' as "Object Type",
    schemaname || '.' || viewname as "Object Name"
FROM pg_views
WHERE definition ILIKE '%payment_approval.accountant_brands%'

UNION ALL

SELECT
    '❌ FUNCTION' as "Object Type",
    n.nspname || '.' || p.proname as "Object Name"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc ILIKE '%payment_approval.accountant_brands%'
  AND p.prokind IN ('f', 'p')

ORDER BY "Object Type", "Object Name";

-- ============================================================================
-- 如果第 5 個查詢返回空結果，代表所有錯誤引用都已修正！
-- ============================================================================
