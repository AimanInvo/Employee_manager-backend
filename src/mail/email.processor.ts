import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';

@Processor('emails')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'leave-request-created') {
      await this.mailService.sendLeaveRequestCreatedEmail(job.data);
    }

    if (job.name === 'leave-approved') {
      await this.mailService.sendLeaveApprovedEmail(job.data);
    }

    if (job.name === 'leave-rejected') {
      await this.mailService.sendLeaveRejectedEmail(job.data);
    }
  }
}
