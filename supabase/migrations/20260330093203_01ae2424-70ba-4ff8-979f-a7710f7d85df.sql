-- Migration neutralized: previously contained 29 hardcoded Italian fiscal codes (PII).
-- Original intent: flag specific spr2_records as is_remote = true.
-- PII removed from source code per GDPR best practices. The flagging was already
-- applied to the database when this migration originally ran; this file is now a no-op.
SELECT 1;
