import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';
import { EnvelopeEntity } from './entities/envelope.entity';
import { SnapshotEntity } from './entities/snapshot.entity';
import { FinancesSettingsEntity } from './entities/finances-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EnvelopeEntity,
      SnapshotEntity,
      FinancesSettingsEntity,
    ]),
  ],
  controllers: [FinancesController],
  providers: [FinancesService],
})
export class FinancesModule {}
