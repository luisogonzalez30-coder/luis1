import { Rol } from "@centinela-ta/database";

export interface AuthContext {
  usuarioId: string;
  municipioId: string;
  rol: Rol;
  email: string;
}

declare module "express" {
  interface Request {
    auth?: AuthContext;
  }
}
