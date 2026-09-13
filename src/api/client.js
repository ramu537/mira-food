const API_URL = (import.meta?.env?.VITE_API_URL?.trim() || "/api").replace(/\/$/, "");

let accessTokenProvider = null;

/** Registers authentication later without coupling this app to an auth SDK. */
export function configureAccessTokenProvider(provider) {
  if (provider !== null && typeof provider !== "function") {
    throw new TypeError("The access token provider must be a function or null.");
  }
  accessTokenProvider = provider;
}

async function readBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (contentType.includes("json")) return response.json();
  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiRequest(path, options = {}) {
  const token = accessTokenProvider ? await accessTokenProvider() : null;
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Unable to reach the food service. Check your connection and try again.");
  }

  const body = await readBody(response);
  if (!response.ok) {
    throw new Error(body?.detail || body?.message || "The request could not be completed. Please try again.");
  }
  return body;
}

