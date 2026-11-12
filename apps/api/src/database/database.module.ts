import { Global, Module } from '@nestjs/common';
import { dataSource } from './data-source';

export const DATA_SOURCE = 'DATA_SOURCE';

@Global()
@Module({ providers: [{ provide: DATA_SOURCE, useValue: dataSource }], exports: [DATA_SOURCE] })
export class DatabaseModule {}
