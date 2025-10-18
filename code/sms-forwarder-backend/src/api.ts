import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Config, ApiResponse } from "./types";

const KEY_BASE_URL = "BASE_URL";

export async function setBaseUrl(url: string) {
  const trimmed = url.replace(/\/+$/, "");
  await AsyncStorage.setItem(KEY_BASE_URL, trimmed);
}

export async function getBaseUrl(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_BASE_URL);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await getBaseUrl();
  if (!base) throw new Error("Backend base URL not set.");
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...(init || {})
  });
  return res.json();
}

export async function getConfig(): Promise<Config> {
  const data = await request<Config>("/config");
  return data;
}

export async function updateConfig(cfg: Config): Promise<ApiResponse<Config>> {
  const data = await request<ApiResponse<Config>>("/config", {
    method: "POST",
    body: JSON.stringify(cfg)
  });
  return data;
}
