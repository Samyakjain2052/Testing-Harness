import { BlobServiceClient } from '@azure/storage-blob';
import { getConfig } from './index.js';

let _blobServiceClient: BlobServiceClient | null = null;

export function getBlobServiceClient(): BlobServiceClient {
  if (_blobServiceClient) return _blobServiceClient;

  const config = getConfig();
  _blobServiceClient = BlobServiceClient.fromConnectionString(
    config.AZURE_STORAGE_CONNECTION_STRING,
  );

  return _blobServiceClient;
}
