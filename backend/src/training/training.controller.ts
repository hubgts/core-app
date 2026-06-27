import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingTemplateService } from './training-template.service';
import { TrainingProgramService } from './training-program.service';
import { EventInput, ProgramInput, StartProgramInput, TemplateInput } from './types';

@Controller('training')
export class TrainingController {
  constructor(
    private readonly training: TrainingService,
    private readonly templates: TrainingTemplateService,
    private readonly programs: TrainingProgramService,
  ) {}

  /** Séances sur une plage de dates (pour peindre le calendrier). */
  @Get('events')
  events(@Query('from') from: string, @Query('to') to: string) {
    return this.training.eventsInRange(from, to);
  }

  // --- Templates (modèles de séance réutilisables) ---

  @Get('templates')
  listTemplates(@Query('q') q?: string, @Query('type') type?: string) {
    return this.templates.list(q, type);
  }

  @Get('templates/:id')
  template(@Param('id') id: string) {
    return this.templates.get(id);
  }

  @Post('templates')
  createTemplate(@Body() body: TemplateInput) {
    return this.templates.create(body ?? {});
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: TemplateInput) {
    return this.templates.update(id, body ?? {});
  }

  @Delete('templates/:id')
  async removeTemplate(@Param('id') id: string) {
    await this.templates.remove(id);
    return { ok: true };
  }

  // --- Programmes / cycles (phases → semaines → séances) ---

  @Get('programs')
  listPrograms(@Query('q') q?: string) {
    return this.programs.list(q);
  }

  @Get('programs/:id')
  program(@Param('id') id: string) {
    return this.programs.get(id);
  }

  @Post('programs')
  createProgram(@Body() body: ProgramInput) {
    return this.programs.create(body ?? {});
  }

  @Patch('programs/:id')
  updateProgram(@Param('id') id: string, @Body() body: ProgramInput) {
    return this.programs.update(id, body ?? {});
  }

  @Delete('programs/:id')
  async removeProgram(@Param('id') id: string) {
    await this.programs.remove(id);
    return { ok: true };
  }

  /** Aperçu du placement des séances pour une date de début. */
  @Get('programs/:id/preview')
  previewProgram(@Param('id') id: string, @Query('startDate') startDate?: string) {
    return this.programs.previewStart(id, startDate);
  }

  /** Démarre le programme : crée les séances réelles dans le planning. */
  @Post('programs/:id/start')
  startProgram(@Param('id') id: string, @Body() body: StartProgramInput) {
    return this.programs.start(id, body?.startDate);
  }

  /** Autocomplétion des noms d'exercices déjà saisis. */
  @Get('exercises/names')
  exerciseNames(@Query('q') q?: string) {
    return this.training.exerciseNames(q);
  }

  /** Statistiques agrégées sur une période (consommées par le Dashboard). */
  @Get('stats')
  stats(@Query('from') from: string, @Query('to') to: string) {
    return this.training.stats(from, to);
  }

  @Get('events/:id')
  event(@Param('id') id: string) {
    return this.training.getEvent(id);
  }

  @Post('events')
  create(@Body() body: EventInput) {
    return this.training.create(body ?? {});
  }

  @Patch('events/:id')
  update(@Param('id') id: string, @Body() body: EventInput) {
    return this.training.update(id, body ?? {});
  }

  @Delete('events/:id')
  async remove(@Param('id') id: string) {
    await this.training.remove(id);
    return { ok: true };
  }
}
