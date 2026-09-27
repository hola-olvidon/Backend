import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MobileMediaController } from './mobile-media.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MediaController, MobileMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
