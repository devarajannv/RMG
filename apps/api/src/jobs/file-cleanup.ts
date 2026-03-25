/**
 * I-02: File Cleanup Job
 * Periodically removes orphaned uploaded files that are not referenced by any document record.
 * Run via cron or scheduled task: `npx ts-node src/jobs/file-cleanup.ts`
 */

import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const MAX_AGE_HOURS = 24; // Files older than this without a DB reference are deleted

export async function cleanupOrphanedFiles(): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      logger.info('Uploads directory does not exist, skipping cleanup');
      return { deleted, errors };
    }

    const files = fs.readdirSync(UPLOADS_DIR);
    const cutoffTime = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;

    // Get all known file paths from the database
    const documents = await prisma.document.findMany({
      select: { storagePath: true },
    });
    const knownPaths = new Set(
      documents.map((doc) => path.basename(doc.storagePath))
    );

    for (const file of files) {
      // Skip hidden files and directories
      if (file.startsWith('.')) continue;

      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;

        // Only delete files older than cutoff that have no DB reference
        if (stat.mtimeMs < cutoffTime && !knownPaths.has(file)) {
          fs.unlinkSync(filePath);
          deleted++;
          logger.info(`Deleted orphaned file: ${file}`);
        }
      } catch (err) {
        errors++;
        logger.error(`Failed to process file during cleanup: ${file} - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    logger.info(`File cleanup completed: ${deleted} deleted, ${errors} errors, ${files.length} total`);
  } catch (err) {
    logger.error(`File cleanup job failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    errors++;
  }

  return { deleted, errors };
}

// Run directly if invoked as a script
if (require.main === module) {
  cleanupOrphanedFiles()
    .then((result) => {
      console.log(`Cleanup complete: ${result.deleted} files deleted, ${result.errors} errors`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}
