import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { CreateOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateOrderDto) { return this.orders.create(user.sub, body); }

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.orders.list(user.sub); }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.orders.get(user.sub, id); }
}
