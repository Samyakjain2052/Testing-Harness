import { getBlobServiceClient } from '../config/azure-blob.js';
import type { ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { BLOB_CONTAINERS } from '@testing-harness/shared';

export class BlobStorageService {
  private getContainer(containerName: string): ContainerClient {
    return getBlobServiceClient().getContainerClient(containerName);
  }

  private getBlob(containerName: string, blobPath: string): BlockBlobClient {
    return this.getContainer(containerName).getBlockBlobClient(blobPath);
  }

  async uploadBuffer(
    containerName: string,
    blobPath: string,
    content: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    const blob = this.getBlob(containerName, blobPath);
    await blob.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blobPath;
  }

  async uploadText(
    containerName: string,
    blobPath: string,
    content: string,
    contentType = 'text/plain',
  ): Promise<string> {
    return this.uploadBuffer(containerName, blobPath, Buffer.from(content, 'utf-8'), contentType);
  }

  async downloadText(containerName: string, blobPath: string): Promise<string> {
    const blob = this.getBlob(containerName, blobPath);
    const response = await blob.download(0);
    const body = response.readableStreamBody;
    if (!body) throw new Error(`Empty blob: ${containerName}/${blobPath}`);

    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  async downloadBuffer(containerName: string, blobPath: string): Promise<Buffer> {
    const blob = this.getBlob(containerName, blobPath);
    const response = await blob.download(0);
    const body = response.readableStreamBody;
    if (!body) throw new Error(`Empty blob: ${containerName}/${blobPath}`);

    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async exists(containerName: string, blobPath: string): Promise<boolean> {
    const blob = this.getBlob(containerName, blobPath);
    return blob.exists();
  }

  async deleteBlob(containerName: string, blobPath: string): Promise<void> {
    const blob = this.getBlob(containerName, blobPath);
    await blob.deleteIfExists();
  }

  async listBlobs(containerName: string, prefix: string): Promise<string[]> {
    const container = this.getContainer(containerName);
    const paths: string[] = [];

    for await (const item of container.listBlobsFlat({ prefix })) {
      paths.push(item.name);
    }
    return paths;
  }

  async uploadScript(appId: string, scriptId: string, content: string, version: number): Promise<string> {
    const blobPath = `${appId}/${scriptId}/v${version}/test.spec.ts`;
    await this.uploadText(BLOB_CONTAINERS.TEST_SCRIPTS, blobPath, content, 'text/typescript');
    return blobPath;
  }

  async downloadScript(blobPath: string): Promise<string> {
    return this.downloadText(BLOB_CONTAINERS.TEST_SCRIPTS, blobPath);
  }
}
