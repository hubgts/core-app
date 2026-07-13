import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { ImportService } from './import.service';
import { BudgetCategoryEntity } from './entities/budget-category.entity';
import { BudgetTransactionEntity } from './entities/budget-transaction.entity';
import { BudgetSettingsEntity } from './entities/budget-settings.entity';
import { BudgetMonthPlanEntity } from './entities/budget-month-plan.entity';
import { BudgetImportEntity } from './entities/budget-import.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BudgetCategoryEntity,
      BudgetTransactionEntity,
      BudgetSettingsEntity,
      BudgetMonthPlanEntity,
      BudgetImportEntity,
    ]),
  ],
  controllers: [BudgetController],
  providers: [BudgetService, ImportService],
})
export class BudgetModule {}
