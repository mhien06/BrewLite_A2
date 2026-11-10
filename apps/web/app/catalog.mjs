export function formatVndPrice(amount) {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

export function stockLabel(stock) {
  return stock > 0 ? 'CÒN HÀNG' : 'TẠM HẾT';
}

export function splitOptions(options) {
  return {
    sizes: options.filter(option => option.kind === 'SIZE'),
    toppings: options.filter(option => option.kind === 'TOPPING'),
  };
}
