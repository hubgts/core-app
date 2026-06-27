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
import { KnowHowService } from './knowhow.service';
import { CategoryInput, KnowHowInput } from './types';

@Controller('knowhow')
export class KnowHowController {
  constructor(private readonly knowhow: KnowHowService) {}

  // --- Catégories (routes statiques avant les routes paramétrées) ---

  @Get('categories')
  listCategories() {
    return this.knowhow.listCategories();
  }

  @Post('categories')
  createCategory(@Body() body: CategoryInput) {
    return this.knowhow.createCategory(body ?? {});
  }

  @Put('categories/reorder')
  reorderCategories(@Body() body: { ids: string[] }) {
    return this.knowhow.reorderCategories(body?.ids);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: CategoryInput) {
    return this.knowhow.updateCategory(id, body ?? {});
  }

  @Delete('categories/:id')
  async removeCategory(@Param('id') id: string) {
    await this.knowhow.removeCategory(id);
    return { ok: true };
  }

  // --- Savoir-faire ---

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    return this.knowhow.list(includeArchived === 'true');
  }

  @Post()
  create(@Body() body: KnowHowInput) {
    return this.knowhow.create(body ?? {});
  }

  /** Réordonne les savoir-faire. Doit précéder les routes paramétrées. */
  @Put('reorder')
  reorder(@Body() body: { ids: string[] }) {
    return this.knowhow.reorder(body?.ids);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.knowhow.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: KnowHowInput) {
    return this.knowhow.update(id, body ?? {});
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.knowhow.duplicate(id);
  }

  @Post(':id/pin')
  pin(@Param('id') id: string) {
    return this.knowhow.setPinned(id, true);
  }

  @Post(':id/unpin')
  unpin(@Param('id') id: string) {
    return this.knowhow.setPinned(id, false);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.knowhow.archive(id);
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.knowhow.unarchive(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.knowhow.remove(id);
    return { ok: true };
  }
}
