import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type LeaveDecisionEmailData = {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  numberOfDays: number;
};

type LeaveRequestCreatedEmailData = {
  managerEmails: string[];
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  numberOfDays: number;
  reason: string;
};

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async sendLeaveApprovedEmail(data: LeaveDecisionEmailData) {
    const startDate = this.formatDate(data.startDate);
    const endDate = this.formatDate(data.endDate);
    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: data.employeeEmail,
      subject: 'Your leave request was approved',
      text: `Hello ${data.employeeName},

Your ${data.leaveType} leave request has been approved.

Start date: ${startDate}
End date: ${endDate}
Total days: ${data.numberOfDays}`,
    });
  }

  async sendLeaveRejectedEmail(data: LeaveDecisionEmailData) {
    const startDate = this.formatDate(data.startDate);
    const endDate = this.formatDate(data.endDate);
    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: data.employeeEmail,
      subject: 'Your leave request was rejected',
      text: `Hello ${data.employeeName},

Your ${data.leaveType} leave request has been rejected.

Start date: ${startDate}
End date: ${endDate}
Total days: ${data.numberOfDays}`,
    });
  }

  async sendLeaveRequestCreatedEmail(data: LeaveRequestCreatedEmailData) {
    const startDate = this.formatDate(data.startDate);
    const endDate = this.formatDate(data.endDate);
    const transporter = this.createTransporter();

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: data.managerEmails,
      subject: `New leave request from ${data.employeeName}`,
      text: `Hello,

${data.employeeName} (${data.employeeEmail}) has submitted a new ${data.leaveType} leave request.

Start date: ${startDate}
End date: ${endDate}
Total days: ${data.numberOfDays}
Reason: ${data.reason}`,
    });
  }

  private createTransporter() {
    return nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT')),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  private getFromAddress() {
    return `"${this.config.get<string>('MAIL_FROM_NAME')}" <${this.config.get<string>('MAIL_FROM_EMAIL')}>`;
  }

  private formatDate(value: Date | string) {
    return new Intl.DateTimeFormat('en-CA').format(new Date(value));
  }
}
