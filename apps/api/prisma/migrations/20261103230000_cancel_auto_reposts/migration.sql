-- Automatic reposts (1 day, 7 days, price update) were removed; re-sharing is
-- now manual only. Drop the ones that were already scheduled.
UPDATE "social_posts"
SET "deletedAt" = NOW()
WHERE "status" = 'SCHEDULED'
  AND "deletedAt" IS NULL
  AND "repostStrategy" IN ('D1', 'D7', 'PRICE_UPDATE');
