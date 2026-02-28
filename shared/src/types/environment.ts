export interface IEnvironment {
  id: string;
  app_id: string;
  name: string;
  base_url: string;
  is_active: boolean;
  variables: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ICreateEnvironmentDto {
  name: string;
  base_url: string;
  variables?: Record<string, string>;
}

export interface IUpdateEnvironmentDto {
  name?: string;
  base_url?: string;
  is_active?: boolean;
  variables?: Record<string, string>;
}
