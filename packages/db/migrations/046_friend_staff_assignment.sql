-- 046_friend_staff_assignment.sql
-- friends テーブルに担当スタッフ（主担当・副担当）カラムを追加。
-- staff_members テーブルの既存ロール制御（owner/admin/staff）を活用する。

ALTER TABLE friends ADD COLUMN primary_staff_id   TEXT REFERENCES staff_members(id) ON DELETE SET NULL;
ALTER TABLE friends ADD COLUMN secondary_staff_id  TEXT REFERENCES staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_friends_primary_staff   ON friends (primary_staff_id);
CREATE INDEX IF NOT EXISTS idx_friends_secondary_staff ON friends (secondary_staff_id);
