// 服务器状态类型
export type ServerStatus = 'connecting' | 'connected' | 'disconnected';

// 工具输入模式类型
export interface ToolInputSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

// 工具类型
export interface Tool {
  name: string;
  description?: string;
  inputSchema: ToolInputSchema;
}

// 服务器配置类型
export interface ServerConfig {
  url?: string;
  command?: string;
  args?: string[] | string;
  env?: Record<string, string>;
}

// 服务器类型
export interface Server {
  name: string;
  status: ServerStatus;
  tools?: Tool[];
  config?: ServerConfig;
  enabled?: boolean;
}

// 环境变量类型
export interface EnvVar {
  key: string;
  value: string;
}

// 表单数据类型
export interface ServerFormData {
  name: string;
  url: string;
  command: string;
  arguments: string;
  args: string[];
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Auth types
export interface IUser {
  username: string;
  isAdmin?: boolean;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  user: IUser | null;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  isAdmin?: boolean;
}

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: IUser;
  message?: string;
  errors?: Array<{ msg: string }>;
}