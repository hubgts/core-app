import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowHowController } from './knowhow.controller';
import { KnowHowService } from './knowhow.service';
import { KnowHowEntity } from './entities/knowhow.entity';
import { KnowHowCategoryEntity } from './entities/knowhow-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KnowHowEntity, KnowHowCategoryEntity])],
  controllers: [KnowHowController],
  providers: [KnowHowService],
})
export class KnowHowModule {}
