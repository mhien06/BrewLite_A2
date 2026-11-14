import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, ValidationPipe } from '@nestjs/common';
import { Roles } from '../common/roles.decorator';
import { StaffOrdersService } from './staff-orders.service';
import { UpdateStaffOrderStatusDto } from './staff-orders.dto';

@Controller('staff/orders')
@Roles('STAFF', 'MANAGER')
export class StaffOrdersController {
  constructor(@Inject(StaffOrdersService) private readonly orders: StaffOrdersService) {}

  @Get()
  list() { return this.orders.list(); }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) { return this.orders.get(id); }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ expectedType: UpdateStaffOrderStatusDto, whitelist: true, forbidNonWhitelisted: true, transform: true }))
    body: UpdateStaffOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, body.status);
  }
}
