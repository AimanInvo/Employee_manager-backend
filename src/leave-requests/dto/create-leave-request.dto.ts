import { ApiProperty } from '@nestjs/swagger';
import { LeaveType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateLeaveRequestDto {
   @ApiProperty({ enum: LeaveType, example: LeaveType.SICK })
  // The type of leave being requested (e.g., vacation, sick leave)
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @ApiProperty({ description: 'The start date of the leave request', example: '2023-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'The end date of the leave request', example: '2023-01-05' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'The reason for the leave request', example: 'Feeling unwell' })
  // The reason for the leave request is a required field and must be a non-empty string
  @IsString()
  @IsNotEmpty()
  reason: string;
}
