import { Module } from '@nestjs/common';
import { StaffOrdersController } from './staff-orders.controller';
import { StaffOrdersService } from './staff-orders.service';

@Module({ controllers: [StaffOrdersController], providers: [StaffOrdersService] })
export class StaffModule {}
