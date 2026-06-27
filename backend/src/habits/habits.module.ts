import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitsController } from './habits.controller';
import { HabitsService } from './habits.service';
import { HabitEntity } from './entities/habit.entity';
import { HabitCheckEntity } from './entities/habit-check.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HabitEntity, HabitCheckEntity])],
  controllers: [HabitsController],
  providers: [HabitsService],
})
export class HabitsModule {}
