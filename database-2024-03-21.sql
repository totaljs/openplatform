--- The script is targeted only for older existing instances
ALTER TABLE op.tbl_app ADD COLUMN "isexternal" bool DEFAULT false;