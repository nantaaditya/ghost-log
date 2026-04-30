import "server-only";
import { getValidAccessToken } from "./token";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0/me";

async function graphFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken();
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function writeFile(drivePath: string, content: string): Promise<void> {
  const encoded = encodeURIComponent(drivePath).replace(/%2F/g, "/");
  const res = await graphFetch(`/drive/root:/${encoded}:/content`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OneDrive writeFile failed (${res.status}): ${text}`);
  }
}

export async function readFile(drivePath: string): Promise<string> {
  const encoded = encodeURIComponent(drivePath).replace(/%2F/g, "/");
  const res = await graphFetch(`/drive/root:/${encoded}:/content`);

  if (res.status === 404) throw new Error("File not found");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OneDrive readFile failed (${res.status}): ${text}`);
  }

  return res.text();
}

export async function listFolder(drivePath: string): Promise<string[]> {
  const encoded = encodeURIComponent(drivePath).replace(/%2F/g, "/");
  const res = await graphFetch(`/drive/root:/${encoded}:/children`);

  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OneDrive listFolder failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { value: { name: string }[] };
  return data.value.map((item) => item.name);
}
