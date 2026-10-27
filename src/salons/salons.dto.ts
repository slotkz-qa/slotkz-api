import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SearchSalonsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50_000)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50_000)
  priceMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
