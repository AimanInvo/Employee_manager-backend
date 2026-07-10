import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeaveBalancesModule } from './leave-balances/leave-balances.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisPassword = config.get<string>('REDIS_PASSWORD');

        return {
          connection: {
            host: config.get<string>('REDIS_HOST', '127.0.0.1'),
            port: Number(config.get<string>('REDIS_PORT', '6379')),
            db: Number(config.get<string>('REDIS_DB', '0')),
            password: redisPassword || undefined,
          },
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LeaveBalancesModule,
    LeaveRequestsModule,
    AuditLogsModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
