import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

@Module({
  // Import the AuthModule to handle authentication and authorization for leave requests
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: 'emails',
    }),
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
