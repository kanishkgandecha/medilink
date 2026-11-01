-- Phase 2: token revocation and per-account login lockout. Additive only;
-- existing rows get tokenVersion 0 (existing tokens stay valid until revoked).
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
