import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { MailService } from './mail.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emails',
    }),
  ],
  providers: [MailService, EmailProcessor],
  exports: [BullModule],
})
export class MailModule {}
