import { IsInt, IsISO8601 } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  masterId: number;

  @IsISO8601({ strict: true })
  startsAt: string;
}

export class RescheduleBookingDto {
  @IsISO8601({ strict: true })
  startsAt: string;
}
