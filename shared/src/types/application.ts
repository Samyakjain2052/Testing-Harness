export interface IApplication {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ICreateApplicationDto {
  name: string;
  description?: string;
}

export interface IUpdateApplicationDto {
  name?: string;
  description?: string;
}
