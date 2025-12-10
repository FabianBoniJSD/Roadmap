-- Add health snapshot fields for SharePoint provisioning metadata
ALTER TABLE "RoadmapInstance" ADD COLUMN "spHealthJson" TEXT;
ALTER TABLE "RoadmapInstance" ADD COLUMN "spHealthCheckedAt" DATETIME;
