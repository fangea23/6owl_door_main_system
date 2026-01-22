-- ============================================================================
-- 檢查資料庫中所有引用 accountant_brands 的物件
-- ============================================================================

-- 1. 檢查所有 FUNCTIONS 的定義中是否有 accountant_brands
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%accountant_brands%'
ORDER BY schema_name, function_name;

-- ============================================================================

-- 2. 檢查所有 VIEWS 的定義中是否有 accountant_brands
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition ILIKE '%accountant_brands%'
ORDER BY schemaname, viewname;

-- ============================================================================

-- 3. 檢查所有 TRIGGERS
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%accountant_brands%'
   OR t.tgname ILIKE '%accountant%'
ORDER BY schema_name, table_name, trigger_name;

-- ============================================================================

-- 4. 檢查所有 POLICIES (RLS policies)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE qual::text ILIKE '%accountant_brands%'
   OR with_check::text ILIKE '%accountant_brands%'
   OR policyname ILIKE '%accountant%'
ORDER BY schemaname, tablename, policyname;

-- ============================================================================

-- 5. 檢查 accountant_brands 表本身的 schema
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'accountant_brands';

-- ============================================================================

-- 6. 檢查 accountant_brands 表上的所有 constraints
SELECT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'accountant_brands'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ============================================================================

-- 7. 簡易版：直接搜尋所有包含 "payment_approval.accountant_brands" 的物件
-- (這個會搜尋 functions, views, triggers 的定義)
SELECT
    'FUNCTION' as object_type,
    n.nspname || '.' || p.proname AS object_name,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%payment_approval.accountant_brands%'

UNION ALL

SELECT
    'VIEW' as object_type,
    schemaname || '.' || viewname AS object_name,
    definition
FROM pg_views
WHERE definition ILIKE '%payment_approval.accountant_brands%'

ORDER BY object_type, object_name;
