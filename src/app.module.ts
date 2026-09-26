import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AlarmsModule } from './alarms/alarms.module';
import { MediaModule } from './media/media.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './config/settings.module';

@Module({
  imports: [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TenantsModule,
    PrismaModule,
    AlarmsModule,
    MediaModule,
    AuthModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
