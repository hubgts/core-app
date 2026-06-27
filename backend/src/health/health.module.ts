import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { BodyMeasurementEntity } from './entities/body-measurement.entity';
import { MeasurementValueEntity } from './entities/measurement-value.entity';
import { HealthProfileEntity } from './entities/health-profile.entity';
import { HealthGoalEntity } from './entities/health-goal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BodyMeasurementEntity,
      MeasurementValueEntity,
      HealthProfileEntity,
      HealthGoalEntity,
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
