import { BadRequestException, ConflictException } from '@nestjs/common';

const MAX_DATABASE_INTEGER = 2_147_483_647;

export function aggregateOrderQuantities(items: Array<{ productId: number; quantity: number }>) {
  const required = new Map<number, number>();
  for (const item of items) {
    const quantity = (required.get(item.productId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity > MAX_DATABASE_INTEGER) {
      throw new BadRequestException({ code: 'ORDER_QUANTITY_TOO_LARGE', message: 'The requested quantity is too large.' });
    }
    required.set(item.productId, quantity);
  }
  return required;
}

export function assertSufficientStock(productId: number, requested: number, available: number) {
  if (available < requested) {
    throw new ConflictException({
      code: 'INSUFFICIENT_STOCK',
      message: 'Not enough stock for this order.',
      productId,
      requested,
      available,
    });
  }
}

export function calculateLineAmounts(basePrice: number, sizeSurcharge: number, toppingSurcharges: number[], quantity: number) {
  const unitPrice = basePrice + sizeSurcharge + toppingSurcharges.reduce((sum, surcharge) => sum + surcharge, 0);
  const lineTotal = unitPrice * quantity;
  if (
    !Number.isSafeInteger(unitPrice) || unitPrice > MAX_DATABASE_INTEGER ||
    !Number.isSafeInteger(lineTotal) || lineTotal > MAX_DATABASE_INTEGER
  ) {
    throw new BadRequestException({ code: 'ORDER_AMOUNT_TOO_LARGE', message: 'The order amount is too large.' });
  }
  return { unitPrice, lineTotal };
}

export function calculateOrderSubtotal(lines: Array<{ lineTotal: number }>) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  if (!Number.isSafeInteger(subtotal) || subtotal > MAX_DATABASE_INTEGER) {
    throw new BadRequestException({ code: 'ORDER_AMOUNT_TOO_LARGE', message: 'The order amount is too large.' });
  }
  return subtotal;
}
