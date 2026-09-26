import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { MobileController } from './mobile.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantsController, MobileController],
  providers: [TenantsService],
})
export class TenantsModule {}
