import { IsUrl } from "class-validator";

export class ActualizarSolicitudDto {
  @IsUrl({ require_tld: false })
  respuestaUrl!: string;
}
