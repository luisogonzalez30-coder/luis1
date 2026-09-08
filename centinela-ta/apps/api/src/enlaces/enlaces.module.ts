import { Module } from "@nestjs/common";
import { EnlacesController } from "./enlaces.controller";
import { EnlacesService } from "./enlaces.service";

@Module({
  controllers: [EnlacesController],
  providers: [EnlacesService],
  exports: [EnlacesService],
})
export class EnlacesModule {}
