import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export class CreateOrderItemDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2_147_483_647) productId!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(2_147_483_647) sizeOptionId!: number;
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(10) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) @Max(2_147_483_647, { each: true }) toppingOptionIds: number[] = [];
  @Type(() => Number) @IsInt() @Min(1) @Max(2_147_483_647) quantity!: number;
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
