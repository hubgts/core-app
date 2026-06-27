import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { TrainingTemplateService } from './training-template.service';
import { TrainingProgramService } from './training-program.service';
import { TrainingEventEntity } from './entities/training-event.entity';
import { ExerciseEntity } from './entities/exercise.entity';
import { ExerciseSetEntity } from './entities/exercise-set.entity';
import { TrainingTemplateEntity } from './entities/training-template.entity';
import { TrainingProgramEntity } from './entities/training-program.entity';
import { TrainingProgramPhaseEntity } from './entities/training-program-phase.entity';
import { TrainingProgramWeekEntity } from './entities/training-program-week.entity';
import { TrainingProgramSessionEntity } from './entities/training-program-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingEventEntity,
      ExerciseEntity,
      ExerciseSetEntity,
      TrainingTemplateEntity,
      TrainingProgramEntity,
      TrainingProgramPhaseEntity,
      TrainingProgramWeekEntity,
      TrainingProgramSessionEntity,
    ]),
  ],
  controllers: [TrainingController],
  providers: [TrainingService, TrainingTemplateService, TrainingProgramService],
})
export class TrainingModule {}
