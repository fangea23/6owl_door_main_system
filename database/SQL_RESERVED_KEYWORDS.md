# SQL 保留關鍵字修正總結

## 🔧 已修正的保留關鍵字

本系統中使用了以下 SQL 保留關鍵字作為欄位名，已全部加上雙引號：

### 1. **position** (職位)
- **影響範圍**: `public.employees` 表
- **修正位置**:
  - `database/unified_employees.sql`: 表定義、INSERT 語句、兩個函數
  - `database/fix_profiles_table.sql`: VIEW 和函數定義
- **語法**: `"position" VARCHAR(100)`

### 2. **location** (位置/地點)
- **影響範圍**: `public.departments` 表、`car_rental.vehicles` 表
- **修正位置**:
  - `database/unified_employees.sql`: departments 表定義
  - `src/system/car_rental_system/database_schema.sql`: vehicles 表定義和 INSERT 語句
- **語法**: `"location" VARCHAR(200)`

### 3. **level** (職級)
- **影響範圍**: `public.employees` 表
- **修正位置**:
  - `database/unified_employees.sql`: 表定義
- **語法**: `"level" VARCHAR(50)`

## 📋 其他已處理的問題

### 4. **avatar_url** (profiles 表欄位)
- **問題**: 舊版 profiles 表可能沒有此欄位
- **修正**: 在 `fix_profiles_table.sql` 中新增檢查，如果欄位不存在則自動新增
- **位置**: `database/fix_profiles_table.sql`

## ✅ 使用規範

### 在表定義中

```sql
-- ❌ 錯誤
CREATE TABLE employees (
  position VARCHAR(100),
  location VARCHAR(200),
  level VARCHAR(50)
);

-- ✅ 正確
CREATE TABLE employees (
  "position" VARCHAR(100),
  "location" VARCHAR(200),
  "level" VARCHAR(50)
);
```

### 在 SELECT 語句中

```sql
-- ❌ 錯誤
SELECT position, location, level FROM employees;

-- ✅ 正確
SELECT "position", "location", "level" FROM employees;
```

### 在 INSERT 語句中

```sql
-- ❌ 錯誤
INSERT INTO employees (position, location, level) VALUES (...);

-- ✅ 正確
INSERT INTO employees ("position", "location", "level") VALUES (...);
```

### 在函數定義中

```sql
-- ❌ 錯誤
CREATE FUNCTION foo()
RETURNS TABLE (position VARCHAR, location VARCHAR)

-- ✅ 正確
CREATE FUNCTION foo()
RETURNS TABLE ("position" VARCHAR, "location" VARCHAR)
```

## 🚨 PostgreSQL 常見保留關鍵字

以下是 PostgreSQL 中常見的保留關鍵字，作為欄位名時必須加雙引號：

### 已在本系統使用的
- `position` ✅ 已修正
- `location` ✅ 已修正
- `level` ✅ 已修正

### 其他常見保留字（未在本系統使用）
- `user`
- `order`
- `group`
- `check`
- `constraint`
- `default`
- `table`
- `type`
- `end`
- `all`
- `and`
- `or`
- `select`
- `insert`
- `update`
- `delete`

## 📖 參考資料

完整的 PostgreSQL 保留關鍵字列表：
https://www.postgresql.org/docs/current/sql-keywords-appendix.html

## 🔍 檢查方式

如果遇到類似錯誤：
```
ERROR: 42601: syntax error at or near "position"
ERROR: 42703: column xxx does not exist
HINT: Perhaps you meant to reference the column "yyy".
```

通常表示使用了保留關鍵字，需要加雙引號。

## ✨ 最佳實踐

1. **避免使用保留關鍵字作為欄位名**（最好的做法）
2. **如果必須使用，一律加雙引號**
3. **在所有地方保持一致**（定義、查詢、插入、更新等）
4. **使用 IDE 的語法檢查功能**

## 📝 修正歷史

- 2026-01-14: 修正 `position` 關鍵字問題
- 2026-01-14: 修正 `location` 和 `level` 關鍵字問題
- 2026-01-14: 新增 `avatar_url` 欄位檢查機制
