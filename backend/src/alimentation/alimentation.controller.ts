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
import { AlimentationService } from './alimentation.service';
import { MealTypeInput, RecipeInput } from './types';

@Controller('alimentation')
export class AlimentationController {
  constructor(private readonly alimentation: AlimentationService) {}

  // --- Types de repas (routes statiques avant les routes paramétrées) ---

  @Get('meal-types')
  listMealTypes() {
    return this.alimentation.listMealTypes();
  }

  @Post('meal-types')
  createMealType(@Body() body: MealTypeInput) {
    return this.alimentation.createMealType(body ?? {});
  }

  @Put('meal-types/reorder')
  reorderMealTypes(@Body() body: { ids: string[] }) {
    return this.alimentation.reorderMealTypes(body?.ids);
  }

  @Patch('meal-types/:id')
  updateMealType(@Param('id') id: string, @Body() body: MealTypeInput) {
    return this.alimentation.updateMealType(id, body ?? {});
  }

  @Delete('meal-types/:id')
  async removeMealType(@Param('id') id: string) {
    await this.alimentation.removeMealType(id);
    return { ok: true };
  }

  // --- Recettes ---

  @Get('recipes')
  list(@Query('includeArchived') includeArchived?: string) {
    return this.alimentation.list(includeArchived === 'true');
  }

  @Post('recipes')
  create(@Body() body: RecipeInput) {
    return this.alimentation.create(body ?? {});
  }

  /** Réordonne les recettes. Doit précéder les routes paramétrées. */
  @Put('recipes/reorder')
  reorder(@Body() body: { ids: string[] }) {
    return this.alimentation.reorder(body?.ids);
  }

  @Get('recipes/:id')
  get(@Param('id') id: string) {
    return this.alimentation.get(id);
  }

  @Patch('recipes/:id')
  update(@Param('id') id: string, @Body() body: RecipeInput) {
    return this.alimentation.update(id, body ?? {});
  }

  @Post('recipes/:id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.alimentation.duplicate(id);
  }

  @Post('recipes/:id/pin')
  pin(@Param('id') id: string) {
    return this.alimentation.setPinned(id, true);
  }

  @Post('recipes/:id/unpin')
  unpin(@Param('id') id: string) {
    return this.alimentation.setPinned(id, false);
  }

  @Post('recipes/:id/archive')
  archive(@Param('id') id: string) {
    return this.alimentation.archive(id);
  }

  @Post('recipes/:id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.alimentation.unarchive(id);
  }

  @Delete('recipes/:id')
  async remove(@Param('id') id: string) {
    await this.alimentation.remove(id);
    return { ok: true };
  }
}
