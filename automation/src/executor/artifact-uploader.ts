import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs/promises';
import path from 'path';
import { BLOB_CONTAINERS, BlobPaths } from '@testing-harness/shared';

export interface UploadedArtifacts {
  screenshots: string[];
  tracePath?: string;
  reportPath?: string;
}

export class ArtifactUploader {
  private blobServiceClient: BlobServiceClient;

  constructor(connectionString: string) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  async uploadAll(executionId: string, tempDir: string): Promise<UploadedArtifacts> {
    const result: UploadedArtifacts = {
      screenshots: [],
    };

    // Upload screenshots
    const screenshotDir = path.join(tempDir, 'test-results');
    try {
      const files = await this.findFiles(screenshotDir, '.png');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blobPath = BlobPaths.screenshot(executionId, i + 1, path.basename(file, '.png'));
        await this.uploadFile(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath, file, 'image/png');
        result.screenshots.push(blobPath);
      }
    } catch {
      // No screenshots directory is fine
    }

    // Upload trace
    const tracePath = path.join(tempDir, 'test-results', 'trace.zip');
    try {
      await fs.access(tracePath);
      const blobPath = BlobPaths.trace(executionId);
      await this.uploadFile(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath, tracePath, 'application/zip');
      result.tracePath = blobPath;
    } catch {
      // No trace file is fine
    }

    // Upload JSON report
    const reportPath = path.join(tempDir, 'report.json');
    try {
      await fs.access(reportPath);
      const blobPath = BlobPaths.report(executionId);
      await this.uploadFile(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath, reportPath, 'application/json');
      result.reportPath = blobPath;
    } catch {
      // No report file is fine
    }

    return result;
  }

  async uploadLogs(executionId: string, stdout: string, stderr: string): Promise<void> {
    const container = this.blobServiceClient.getContainerClient(BLOB_CONTAINERS.TEST_ARTIFACTS);

    if (stdout) {
      const blob = container.getBlockBlobClient(BlobPaths.stdout(executionId));
      await blob.upload(Buffer.from(stdout), Buffer.byteLength(stdout), {
        blobHTTPHeaders: { blobContentType: 'text/plain' },
      });
    }

    if (stderr) {
      const blob = container.getBlockBlobClient(BlobPaths.stderr(executionId));
      await blob.upload(Buffer.from(stderr), Buffer.byteLength(stderr), {
        blobHTTPHeaders: { blobContentType: 'text/plain' },
      });
    }
  }

  private async uploadFile(
    containerName: string,
    blobPath: string,
    filePath: string,
    contentType: string,
  ): Promise<void> {
    const container = this.blobServiceClient.getContainerClient(containerName);
    const blob = container.getBlockBlobClient(blobPath);
    const content = await fs.readFile(filePath);
    await blob.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  }

  private async findFiles(dir: string, extension: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...(await this.findFiles(fullPath, extension)));
        } else if (entry.name.endsWith(extension)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return results;
  }
}
