const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "centinela_ta_token";
const USUARIO_KEY = "centinela_ta_usuario";

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: "super_admin" | "admin_municipal" | "encargado_transparencia" | "auditor";
  municipioId: string;
}

export function guardarSesion(accessToken: string, usuario: UsuarioSesion) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function obtenerUsuario(): UsuarioSesion | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USUARIO_KEY);
  return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    cerrarSesion();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Sesión expirada", 401);
  }

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(cuerpo.message ?? "Error de red", res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
