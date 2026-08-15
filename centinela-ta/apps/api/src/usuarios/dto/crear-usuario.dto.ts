import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { Rol } from "@centinela-ta/database";

const ROLES_ASIGNABLES = [Rol.encargado_transparencia, Rol.auditor, Rol.admin_municipal] as const;

export class CrearUsuarioDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsEnum(ROLES_ASIGNABLES)
  rol!: (typeof ROLES_ASIGNABLES)[number];

  @IsString()
  @MinLength(8)
  password!: string;
}
