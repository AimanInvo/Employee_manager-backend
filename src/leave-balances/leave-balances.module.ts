import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeaveBalancesController } from './leave-balances.controller';
import { LeaveBalancesService } from './leave-balances.service';

@Module({
  imports: [AuthModule],
  controllers: [LeaveBalancesController],
  providers: [LeaveBalancesService]
})
export class LeaveBalancesModule {}
