-- CreateTable
CREATE TABLE "RoadmapInstance" (
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
    "allowSelfSigned" INTEGER NOT NULL DEFAULT 0,
    "needsProxy" INTEGER NOT NULL DEFAULT 0,
    "forceSingleCreds" INTEGER NOT NULL DEFAULT 0,
    "authNoCache" INTEGER NOT NULL DEFAULT 0,
    "manualNtlmFallback" INTEGER NOT NULL DEFAULT 0,
    "ntlmPersistentSocket" INTEGER NOT NULL DEFAULT 0,
    "ntlmSocketProbe" INTEGER NOT NULL DEFAULT 0,
    "extraAuthModes" TEXT,
    "trustedCaPath" TEXT,
    "deploymentEnv" TEXT,
    "defaultLocale" TEXT,
    "defaultTimeZone" TEXT,
    "settingsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RoadmapInstanceHost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "host" TEXT NOT NULL,
    "instanceId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoadmapInstanceHost_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "RoadmapInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapInstance_slug_key" ON "RoadmapInstance"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapInstanceHost_host_key" ON "RoadmapInstanceHost"("host");
