-- Migration: Add house_number and family_number to family_files table
-- Used strictly for GAHAR official paper card print header compatibility

ALTER TABLE family_files ADD COLUMN IF NOT EXISTS house_number TEXT NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS family_number TEXT NULL;

COMMENT ON COLUMN family_files.house_number IS 'رقم المنزل (يُستخدم لترقيم النموذج الورقي الرسمي عند الطباعة)';
COMMENT ON COLUMN family_files.family_number IS 'رقم الأسرة (يُستخدم لترقيم النموذج الورقي الرسمي عند الطباعة)';
