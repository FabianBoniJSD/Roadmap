/*
  Warnings:

  - You are about to drop the column `authNoCache` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `extraAuthModes` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `forceSingleCreds` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `manualNtlmFallback` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `needsProxy` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `ntlmPersistentSocket` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `ntlmSocketProbe` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `spDomain` on the `RoadmapInstance` table. All the data in the column will be lost.
  - You are about to drop the column `spWorkstation` on the `RoadmapInstance` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoadmapInstance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "department" TEXT,
    "description" TEXT,
    "sharePointSiteUrlDev" TEXT NOT NULL,
    "sharePointSiteUrlProd" TEXT,
    "sharePointStrategy" TEXT NOT NULL DEFAULT 'kerberos',
    "spUsername" TEXT NOT NULL,
    "spPassword" TEXT NOT NULL,
    "allowSelfSigned" BOOLEAN NOT NULL DEFAULT false,
    "trustedCaPath" TEXT,
    "deploymentEnv" TEXT,
    "defaultLocale" TEXT,
    "defaultTimeZone" TEXT,
    "landingPage" TEXT,
    "settingsJson" TEXT,
    "spHealthJson" TEXT,
    "spHealthCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RoadmapInstance" ("allowSelfSigned", "createdAt", "defaultLocale", "defaultTimeZone", "department", "deploymentEnv", "description", "displayName", "id", "landingPage", "settingsJson", "sharePointSiteUrlDev", "sharePointSiteUrlProd", "sharePointStrategy", "slug", "spHealthCheckedAt", "spHealthJson", "spPassword", "spUsername", "trustedCaPath", "updatedAt") SELECT "allowSelfSigned", "createdAt", "defaultLocale", "defaultTimeZone", "department", "deploymentEnv", "description", "displayName", "id", "landingPage", "settingsJson", "sharePointSiteUrlDev", "sharePointSiteUrlProd", "sharePointStrategy", "slug", "spHealthCheckedAt", "spHealthJson", "spPassword", "spUsername", "trustedCaPath", "updatedAt" FROM "RoadmapInstance";
DROP TABLE "RoadmapInstance";
ALTER TABLE "new_RoadmapInstance" RENAME TO "RoadmapInstance";
CREATE UNIQUE INDEX "RoadmapInstance_slug_key" ON "RoadmapInstance"("slug");
CREATE UNIQUE INDEX "RoadmapInstance_landingPage_key" ON "RoadmapInstance"("landingPage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
