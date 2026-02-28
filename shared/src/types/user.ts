export enum UserRole {
  ADMIN = 'admin',
  TESTER = 'tester',
  VIEWER = 'viewer',
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ICreateUserDto {
  email: string;
  name: string;
  password: string;
}

export interface ILoginDto {
  email: string;
  password: string;
}

export interface IAuthResponse {
  token: string;
  user: IUser;
}
