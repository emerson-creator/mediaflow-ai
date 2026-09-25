import { apiClient } from "./client";
import type { User } from "../types";

interface AuthResponse {
  accessToken: string;
  user: User;
}

export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", {
    email,
    password,
  });
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}
