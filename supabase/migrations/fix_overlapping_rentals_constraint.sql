-- 修復：prevent_overlapping_rentals 約束應該只檢查進行中的租借
--
-- 問題：
-- 目前的約束會阻止所有重疊的租借記錄，即使某些租借已經還車（completed）或取消（cancelled）
-- 這導致車輛已還車後，該時間段仍然無法被其他人租借
--
-- 解決方案：
-- 重建約束，加入 WHERE 條件只檢查「進行中」的租借（confirmed, in_progress）
-- 已完成（completed）和已取消（cancelled）的租借不應該佔用時間段

-- 1. 移除舊的約束
ALTER TABLE car_rental.rentals
DROP CONSTRAINT IF EXISTS prevent_overlapping_rentals;

-- 2. 創建新的約束，只檢查進行中的租借
-- 使用 WHERE 條件過濾只檢查 confirmed（待取車）和 in_progress（使用中）狀態
-- completed（已還車）和 cancelled（已取消）不會被檢查
ALTER TABLE car_rental.rentals
ADD CONSTRAINT prevent_overlapping_rentals
EXCLUDE USING gist (
  vehicle_id WITH =,
  tsrange(start_date::timestamp, end_date::timestamp, '[]') WITH &&
)
WHERE (status IN ('confirmed', 'in_progress'));

-- 說明：
-- 這樣當車輛還車後（status = 'completed'），該記錄就不再佔用時間段
-- 其他人可以正常預約該車輛在該時間段的租借
