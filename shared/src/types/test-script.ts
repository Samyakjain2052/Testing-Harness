export interface ITestScript {
  id: string;
  app_id: string;
  name: string;
  description: string | null;
  blob_path: string;
  file_size_bytes: number | null;
  content_hash: string | null;
  tags: string[];
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ICreateTestScriptDto {
  name: string;
  description?: string;
  tags?: string[];
}

export interface IUpdateTestScriptDto {
  name?: string;
  description?: string;
  tags?: string[];
}
