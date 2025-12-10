-- Add optional landing page slug per instance
ALTER TABLE "RoadmapInstance" ADD COLUMN "landingPage" TEXT;

-- Ensure landing page identifiers remain unique (NULL values are allowed multiple times)
CREATE UNIQUE INDEX "RoadmapInstance_landingPage_key" ON "RoadmapInstance"("landingPage");
