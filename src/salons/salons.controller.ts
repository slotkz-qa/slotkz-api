import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { SearchSalonsDto } from './salons.dto.js';
import { SalonsService } from './salons.service.js';

@Controller('salons')
export class SalonsController {
  constructor(private readonly salons: SalonsService) {}

  @Get()
  search(@Query() query: SearchSalonsDto) {
    return this.salons.search(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salons.findOne(id);
  }
}
