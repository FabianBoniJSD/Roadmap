-- CreateTable
CREATE TABLE "InstanceDepartmentAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instanceSlug" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "normalizedDepartment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "InstanceDepartmentAccess_instanceSlug_normalizedDepartment_key"
  ON "InstanceDepartmentAccess"("instanceSlug", "normalizedDepartment");

-- CreateIndex
CREATE INDEX "InstanceDepartmentAccess_instanceSlug_idx"
  ON "InstanceDepartmentAccess"("instanceSlug");
