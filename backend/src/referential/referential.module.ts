import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferentialController } from './referential.controller';
import { ReferentialService } from './referential.service';
import { ReferenceItemEntity } from './entities/reference-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReferenceItemEntity])],
  controllers: [ReferentialController],
  providers: [ReferentialService],
  exports: [ReferentialService],
})
export class ReferentialModule {}
