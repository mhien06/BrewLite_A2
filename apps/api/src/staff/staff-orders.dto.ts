import { IsIn } from 'class-validator';

export const STAFF_ORDER_STATUSES = ['PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'] as const;
export type StaffOrderStatus = typeof STAFF_ORDER_STATUSES[number];

export class UpdateStaffOrderStatusDto {
  @IsIn([...STAFF_ORDER_STATUSES])
  status!: StaffOrderStatus;
}
