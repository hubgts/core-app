import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import {
  BudgetSettingsInput,
  CategoryInput,
  PlanInput,
  TransactionInput,
} from './types';

@Controller('finances/budget')
export class BudgetController {
  constructor(private readonly budget: BudgetService) {}

  /** Vue d'ensemble d'un mois : plan vs réel, camembert, reste à allouer. */
  @Get('overview')
  overview(@Query('month') month?: string) {
    return this.budget.overview(month);
  }

  /** Vue cash-flow : entrées vs sorties, taux d'épargne, report mois précédent. */
  @Get('cashflow')
  cashflow(@Query('month') month?: string) {
    return this.budget.cashflow(month);
  }

  // --- Réglages ---
  @Get('settings')
  getSettings() {
    return this.budget.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() body: BudgetSettingsInput) {
    return this.budget.updateSettings(body ?? {});
  }

  // --- Plan mensuel (% par catégorie pour un mois) ---
  @Get('plan')
  getPlan(@Query('month') month?: string) {
    return this.budget.getPlanEditor(month);
  }

  @Put('plan')
  setPlan(@Query('month') month: string, @Body() body: PlanInput) {
    return this.budget.setMonthPlan(month, body ?? {});
  }

  // --- Catégories (routes fixes avant les paramétrées) ---
  @Get('categories')
  listCategories(@Query('includeArchived') includeArchived?: string) {
    return this.budget.listCategories(includeArchived === 'true');
  }

  @Post('categories')
  createCategory(@Body() body: CategoryInput) {
    return this.budget.createCategory(body ?? {});
  }

  @Put('categories/reorder')
  reorderCategories(@Body() body: { ids: string[] }) {
    return this.budget.reorderCategories(body?.ids);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: CategoryInput) {
    return this.budget.updateCategory(id, body ?? {});
  }

  @Post('categories/:id/archive')
  archiveCategory(@Param('id') id: string) {
    return this.budget.archiveCategory(id);
  }

  @Post('categories/:id/unarchive')
  unarchiveCategory(@Param('id') id: string) {
    return this.budget.unarchiveCategory(id);
  }

  @Delete('categories/:id')
  async removeCategory(@Param('id') id: string) {
    await this.budget.removeCategory(id);
    return { ok: true };
  }

  // --- Transactions ---
  @Get('transactions')
  listTransactions(@Query('month') month?: string) {
    return this.budget.listTransactions(month);
  }

  @Post('transactions')
  createTransaction(@Body() body: TransactionInput) {
    return this.budget.createTransaction(body ?? {});
  }

  @Patch('transactions/:id')
  updateTransaction(@Param('id') id: string, @Body() body: TransactionInput) {
    return this.budget.updateTransaction(id, body ?? {});
  }

  @Delete('transactions/:id')
  removeTransaction(@Param('id') id: string) {
    return this.budget.removeTransaction(id);
  }
}
