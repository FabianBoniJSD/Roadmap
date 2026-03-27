import fs from 'node:fs';
import path from 'node:path';

const buildDir = path.join(process.cwd(), '.next');
const stalePrefix = '.next-stale-';

function isLockError(error) {
  return Boolean(
    error && typeof error === 'object' && ['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)
  );
}

function removeDir(targetPath) {
  fs.rmSync(targetPath, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  });
}

function cleanupStaleBuildDirs() {
  const workspaceRoot = process.cwd();
  const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(stalePrefix)) {
      continue;
    }

    const targetPath = path.join(workspaceRoot, entry.name);

    try {
      removeDir(targetPath);
    } catch (error) {
      if (!isLockError(error)) {
        throw error;
      }

      console.warn(`Skipping locked stale build directory: ${entry.name}`);
    }
  }
}

function cleanBuildDir() {
  if (!fs.existsSync(buildDir)) {
    return;
  }

  try {
    removeDir(buildDir);
    return;
  } catch (error) {
    if (!isLockError(error)) {
      throw error;
    }

    const renamedDir = path.join(process.cwd(), `${stalePrefix}${Date.now()}`);

    try {
      fs.renameSync(buildDir, renamedDir);
      console.warn(`Renamed locked .next directory to ${path.basename(renamedDir)} before build.`);

      try {
        removeDir(renamedDir);
      } catch (cleanupError) {
        if (!isLockError(cleanupError)) {
          throw cleanupError;
        }

        console.warn(`Deferred cleanup for locked directory: ${path.basename(renamedDir)}`);
      }
    } catch (renameError) {
      if (!isLockError(renameError)) {
        throw renameError;
      }

      console.warn(
        'Could not remove .next because it is locked by another process. Continuing build without cleanup.'
      );
    }
  }
}

cleanupStaleBuildDirs();
cleanBuildDir();
