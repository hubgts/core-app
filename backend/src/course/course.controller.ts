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
import { CourseService } from './course.service';
import {
  AisleInput,
  ArticleInput,
  ImportRecipeInput,
  ShoppingItemInput,
  ShoppingListInput,
  ShoppingTemplateInput,
} from './types';

@Controller('course')
export class CourseController {
  constructor(private readonly course: CourseService) {}

  // --- Rayons (routes statiques avant les paramétrées) ---

  @Get('aisles')
  listAisles() {
    return this.course.listAisles();
  }

  @Post('aisles')
  createAisle(@Body() body: AisleInput) {
    return this.course.createAisle(body ?? {});
  }

  @Put('aisles/reorder')
  reorderAisles(@Body() body: { ids: string[] }) {
    return this.course.reorderAisles(body?.ids);
  }

  @Patch('aisles/:id')
  updateAisle(@Param('id') id: string, @Body() body: AisleInput) {
    return this.course.updateAisle(id, body ?? {});
  }

  @Delete('aisles/:id')
  async removeAisle(@Param('id') id: string) {
    await this.course.removeAisle(id);
    return { ok: true };
  }

  // --- Articles ---

  @Get('articles')
  listArticles(@Query('q') q?: string) {
    return this.course.listArticles(q);
  }

  @Post('articles')
  createArticle(@Body() body: ArticleInput) {
    return this.course.createArticle(body ?? {});
  }

  @Patch('articles/:id')
  updateArticle(@Param('id') id: string, @Body() body: ArticleInput) {
    return this.course.updateArticle(id, body ?? {});
  }

  @Delete('articles/:id')
  async removeArticle(@Param('id') id: string) {
    await this.course.removeArticle(id);
    return { ok: true };
  }

  // --- Modèles (listes types) ---

  @Get('templates')
  listTemplates() {
    return this.course.listTemplates();
  }

  @Post('templates')
  createTemplate(@Body() body: ShoppingTemplateInput) {
    return this.course.createTemplate(body ?? {});
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.course.getTemplate(id);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: ShoppingTemplateInput) {
    return this.course.updateTemplate(id, body ?? {});
  }

  @Delete('templates/:id')
  async removeTemplate(@Param('id') id: string) {
    await this.course.removeTemplate(id);
    return { ok: true };
  }

  // --- Import recette (aperçu + création depuis recette) ---

  @Get('recipes/:id/preview')
  previewRecipe(@Param('id') id: string, @Query('servings') servings?: string) {
    return this.course.previewRecipe(id, servings ? Number(servings) : null);
  }

  // --- Listes ---

  @Get('lists')
  listLists() {
    return this.course.listLists();
  }

  @Post('lists')
  createList(@Body() body: ShoppingListInput) {
    return this.course.createList(body ?? {});
  }

  @Put('lists/reorder')
  reorderLists(@Body() body: { ids: string[] }) {
    return this.course.reorderLists(body?.ids);
  }

  @Post('lists/from-template/:templateId')
  instantiateTemplate(
    @Param('templateId') templateId: string,
    @Body() body: ShoppingListInput,
  ) {
    return this.course.instantiateTemplate(templateId, body ?? {});
  }

  @Post('lists/from-recipe')
  createListFromRecipe(@Body() body: ImportRecipeInput) {
    return this.course.createListFromRecipe(body ?? {});
  }

  @Get('lists/:id')
  getList(@Param('id') id: string) {
    return this.course.getList(id);
  }

  @Patch('lists/:id')
  updateList(@Param('id') id: string, @Body() body: ShoppingListInput) {
    return this.course.updateList(id, body ?? {});
  }

  @Post('lists/:id/duplicate')
  duplicateList(@Param('id') id: string) {
    return this.course.duplicateList(id);
  }

  @Post('lists/:id/uncheck-all')
  uncheckAll(@Param('id') id: string) {
    return this.course.uncheckAll(id);
  }

  @Delete('lists/:id/checked')
  clearChecked(@Param('id') id: string) {
    return this.course.clearChecked(id);
  }

  @Post('lists/:id/save-as-template')
  saveAsTemplate(@Param('id') id: string, @Body() body: ShoppingTemplateInput) {
    return this.course.saveListAsTemplate(id, body ?? {});
  }

  @Post('lists/:id/apply-template/:templateId')
  applyTemplate(
    @Param('id') id: string,
    @Param('templateId') templateId: string,
  ) {
    return this.course.applyTemplate(id, templateId);
  }

  @Post('lists/:id/import-recipe')
  importRecipe(@Param('id') id: string, @Body() body: ImportRecipeInput) {
    return this.course.importRecipeIntoList(id, body ?? {});
  }

  @Delete('lists/:id')
  async removeList(@Param('id') id: string) {
    await this.course.removeList(id);
    return { ok: true };
  }

  // --- Items d'une liste (routes statiques avant les paramétrées) ---

  @Post('lists/:id/items')
  addItem(@Param('id') id: string, @Body() body: ShoppingItemInput) {
    return this.course.addItem(id, body ?? {});
  }

  @Put('lists/:id/items/reorder')
  reorderItems(@Param('id') id: string, @Body() body: { ids: string[] }) {
    return this.course.reorderItems(id, body?.ids);
  }

  @Post('lists/:id/items/:itemId/toggle')
  toggleItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.course.toggleItem(id, itemId);
  }

  @Patch('lists/:id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: ShoppingItemInput,
  ) {
    return this.course.updateItem(id, itemId, body ?? {});
  }

  @Delete('lists/:id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.course.removeItem(id, itemId);
  }
}
