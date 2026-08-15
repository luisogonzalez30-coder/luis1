import { IsDateString, IsString, MinLength } from "class-validator";

export class CrearSolicitudDto {
  @IsString()
  @MinLength(1)
  folio!: string;

  @IsString()
  @MinLength(2)
  solicitanteNombre!: string;

  @IsDateString()
  fechaIngreso!: string;
}
