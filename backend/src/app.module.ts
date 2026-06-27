import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HabitsModule } from './habits/habits.module';
import { HabitEntity } from './habits/entities/habit.entity';
import { HabitCheckEntity } from './habits/entities/habit-check.entity';
import { TrainingModule } from './training/training.module';
import { TrainingEventEntity } from './training/entities/training-event.entity';
import { ExerciseEntity } from './training/entities/exercise.entity';
import { ExerciseSetEntity } from './training/entities/exercise-set.entity';
import { TrainingTemplateEntity } from './training/entities/training-template.entity';
import { TrainingProgramEntity } from './training/entities/training-program.entity';
import { TrainingProgramPhaseEntity } from './training/entities/training-program-phase.entity';
import { TrainingProgramWeekEntity } from './training/entities/training-program-week.entity';
import { TrainingProgramSessionEntity } from './training/entities/training-program-session.entity';
import { FinancesModule } from './finances/finances.module';
import { EnvelopeEntity } from './finances/entities/envelope.entity';
import { SnapshotEntity } from './finances/entities/snapshot.entity';
import { FinancesSettingsEntity } from './finances/entities/finances-settings.entity';
import { ReferentialModule } from './referential/referential.module';
import { ReferenceItemEntity } from './referential/entities/reference-item.entity';
import { KnowHowModule } from './knowhow/knowhow.module';
import { KnowHowEntity } from './knowhow/entities/knowhow.entity';
import { KnowHowCategoryEntity } from './knowhow/entities/knowhow-category.entity';
import { BettingModule } from './betting/betting.module';
import { BankrollEntity } from './betting/entities/bankroll.entity';
import { BetEntity } from './betting/entities/bet.entity';
import { SelectionEntity } from './betting/entities/selection.entity';
import { HealthModule } from './health/health.module';
import { BodyMeasurementEntity } from './health/entities/body-measurement.entity';
import { MeasurementValueEntity } from './health/entities/measurement-value.entity';
import { HealthProfileEntity } from './health/entities/health-profile.entity';
import { HealthGoalEntity } from './health/entities/health-goal.entity';
import { AlimentationModule } from './alimentation/alimentation.module';
import { RecipeEntity } from './alimentation/entities/recipe.entity';
import { MealTypeEntity } from './alimentation/entities/meal-type.entity';
import { CourseModule } from './course/course.module';
import { AisleEntity } from './course/entities/aisle.entity';
import { ArticleEntity } from './course/entities/article.entity';
import { ShoppingListEntity } from './course/entities/shopping-list.entity';
import { ShoppingTemplateEntity } from './course/entities/shopping-template.entity';
import { BudgetModule } from './budget/budget.module';
import { BudgetCategoryEntity } from './budget/entities/budget-category.entity';
import { BudgetTransactionEntity } from './budget/entities/budget-transaction.entity';
import { BudgetSettingsEntity } from './budget/entities/budget-settings.entity';
import { BudgetMonthPlanEntity } from './budget/entities/budget-month-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER ?? 'progression',
      password: process.env.DB_PASSWORD ?? 'progression',
      database: process.env.DB_NAME ?? 'progression',
      entities: [
        HabitEntity,
        HabitCheckEntity,
        TrainingEventEntity,
        ExerciseEntity,
        ExerciseSetEntity,
        TrainingTemplateEntity,
        TrainingProgramEntity,
        TrainingProgramPhaseEntity,
        TrainingProgramWeekEntity,
        TrainingProgramSessionEntity,
        EnvelopeEntity,
        SnapshotEntity,
        FinancesSettingsEntity,
        ReferenceItemEntity,
        KnowHowEntity,
        KnowHowCategoryEntity,
        BankrollEntity,
        BetEntity,
        SelectionEntity,
        BodyMeasurementEntity,
        MeasurementValueEntity,
        HealthProfileEntity,
        HealthGoalEntity,
        RecipeEntity,
        MealTypeEntity,
        AisleEntity,
        ArticleEntity,
        ShoppingListEntity,
        ShoppingTemplateEntity,
        BudgetCategoryEntity,
        BudgetTransactionEntity,
        BudgetSettingsEntity,
        BudgetMonthPlanEntity,
      ],
      // MVP : le schéma est créé/maintenu automatiquement par TypeORM.
      // À remplacer par des migrations dès qu'on a des données à préserver en prod.
      synchronize: true,
    }),
    HabitsModule,
    TrainingModule,
    FinancesModule,
    ReferentialModule,
    KnowHowModule,
    BettingModule,
    HealthModule,
    AlimentationModule,
    CourseModule,
    BudgetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
