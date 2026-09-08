import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Cifrado a nivel de campo para el único dato personal de un tercero que
 * maneja el sistema: el nombre de quien presenta una solicitud de acceso a
 * la información (Ley 21.719). La llave viene de una variable de entorno
 * en este prototipo — en producción esa llave la emite y rota Cloud KMS,
 * nunca un valor plano en el entorno del contenedor (ver README de
 * infraestructura).
 */
@Injectable()
export class FieldEncryptionService implements OnModuleInit {
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const hex = this.config.get<string>("FIELD_ENCRYPTION_KEY");
    if (!hex || hex.length !== 64) {
      throw new Error(
        "FIELD_ENCRYPTION_KEY debe ser una llave de 32 bytes en hex (64 caracteres). Generar con: openssl rand -hex 32",
      );
    }
    this.key = Buffer.from(hex, "hex");
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // iv.authTag.ciphertext, todo en base64 — formato simple de guardar en una columna text.
    return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
  }

  decrypt(payload: string): string {
    const [ivB64, authTagB64, dataB64] = payload.split(".");
    if (!ivB64 || !authTagB64 || !dataB64) {
      throw new Error("Formato de dato cifrado inválido");
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return decrypted.toString("utf8");
  }
}
