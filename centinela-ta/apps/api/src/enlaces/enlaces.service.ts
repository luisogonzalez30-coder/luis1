import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@centinela-ta/database";
import { AuthContext } from "../common/types/auth-context";

@Injectable()
export class EnlacesService {
  listar(auth: AuthContext, soloCaidos?: boolean) {
    return withTenantContext(auth.municipioId, (tx) =>
      tx.enlace.findMany({
        where: soloCaidos ? { caidoDesde: { not: null } } : undefined,
        include: { seccion: true },
        orderBy: { ultimaVerificacion: "desc" },
      }),
    );
  }
}
