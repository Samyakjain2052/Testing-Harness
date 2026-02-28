import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs/promises';
import path from 'path';
import { BLOB_CONTAINERS } from '@testing-harness/shared';

export class ScriptLoader {
  private blobServiceClient: BlobServiceClient;

  constructor(connectionString: string) {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  async download(blobPath: string, tempDir: string): Promise<string> {
    const container = this.blobServiceClient.getContainerClient(BLOB_CONTAINERS.TEST_SCRIPTS);
    const blob = container.getBlockBlobClient(blobPath);

    const response = await blob.download(0);
    const body = response.readableStreamBody;
    if (!body) {
      throw new Error(`Failed to download script: ${blobPath}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');

    const localPath = path.join(tempDir, 'test.spec.ts');
    await fs.writeFile(localPath, content, 'utf-8');

    return localPath;
  }
}
