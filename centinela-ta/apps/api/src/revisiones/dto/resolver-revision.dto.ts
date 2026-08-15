import { IsOptional, IsString, IsUrl } from "class-validator";

export class ResolverRevisionDto {
  @IsUrl({ require_tld: false })
  evidenciaUrl!: string;

  @IsOptional()
  @IsString()
  comentario?: string;
}
