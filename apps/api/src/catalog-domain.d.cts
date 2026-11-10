export function productDetailResponse<Product extends object, Option>(
  product: Product,
  options: Option[],
): Product & { options: Option[] };
