/*
  Warnings:

  - You are about to alter the column `allowSelfSigned` on the `RoadmapInstance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `authNoCache` on the `RoadmapInstance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `forceSingleCreds` on the `RoadmapInstance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `manualNtlmFallback` on the `RoadmapInstance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `needsProxy` on the `RoadmapInstance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `ntlmPersistentSocket` on the `RoadmapInstance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `ntlmSocketProbe` on the `RoadmapInstance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

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
    "sharePointStrategy" TEXT NOT NULL DEFAULT 'onprem',
    "spUsername" TEXT NOT NULL,
    "spPassword" TEXT NOT NULL,
    "spDomain" TEXT,
    "spWorkstation" TEXT,
    "allowSelfSigned" BOOLEAN NOT NULL DEFAULT false,
    "needsProxy" BOOLEAN NOT NULL DEFAULT false,
    "forceSingleCreds" BOOLEAN NOT NULL DEFAULT false,
    "authNoCache" BOOLEAN NOT NULL DEFAULT false,
    "manualNtlmFallback" BOOLEAN NOT NULL DEFAULT false,
    "ntlmPersistentSocket" BOOLEAN NOT NULL DEFAULT false,
    "ntlmSocketProbe" BOOLEAN NOT NULL DEFAULT false,
    "extraAuthModes" TEXT,
    "trustedCaPath" TEXT,
    "deploymentEnv" TEXT,
    "defaultLocale" TEXT,
    "defaultTimeZone" TEXT,
    "settingsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RoadmapInstance" ("allowSelfSigned", "authNoCache", "createdAt", "defaultLocale", "defaultTimeZone", "department", "deploymentEnv", "description", "displayName", "extraAuthModes", "forceSingleCreds", "id", "manualNtlmFallback", "needsProxy", "ntlmPersistentSocket", "ntlmSocketProbe", "settingsJson", "sharePointSiteUrlDev", "sharePointSiteUrlProd", "sharePointStrategy", "slug", "spDomain", "spPassword", "spUsername", "spWorkstation", "trustedCaPath", "updatedAt") SELECT "allowSelfSigned", "authNoCache", "createdAt", "defaultLocale", "defaultTimeZone", "department", "deploymentEnv", "description", "displayName", "extraAuthModes", "forceSingleCreds", "id", "manualNtlmFallback", "needsProxy", "ntlmPersistentSocket", "ntlmSocketProbe", "settingsJson", "sharePointSiteUrlDev", "sharePointSiteUrlProd", "sharePointStrategy", "slug", "spDomain", "spPassword", "spUsername", "spWorkstation", "trustedCaPath", "updatedAt" FROM "RoadmapInstance";
DROP TABLE "RoadmapInstance";
ALTER TABLE "new_RoadmapInstance" RENAME TO "RoadmapInstance";
CREATE UNIQUE INDEX "RoadmapInstance_slug_key" ON "RoadmapInstance"("slug");
CREATE TABLE "new_RoadmapInstanceHost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "host" TEXT NOT NULL,
    "instanceId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoadmapInstanceHost_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "RoadmapInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RoadmapInstanceHost" ("createdAt", "host", "id", "instanceId", "updatedAt") SELECT "createdAt", "host", "id", "instanceId", "updatedAt" FROM "RoadmapInstanceHost";
DROP TABLE "RoadmapInstanceHost";
ALTER TABLE "new_RoadmapInstanceHost" RENAME TO "RoadmapInstanceHost";
CREATE UNIQUE INDEX "RoadmapInstanceHost_host_key" ON "RoadmapInstanceHost"("host");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
