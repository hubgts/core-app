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
import { HabitsService } from './habits.service';

@Controller('habits')
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  /** Liste les habitudes actives + leurs stats. `today` = date locale du client. */
  @Get()
  list(@Query('today') today?: string) {
    return this.habits.listActive(today);
  }

  /** Coches sur une plage de dates (pour peindre la grille du mois). */
  @Get('checks')
  checks(@Query('from') from: string, @Query('to') to: string) {
    return this.habits.checksInRange(from, to);
  }

  @Post()
  create(
    @Body()
    body: {
      name?: string;
      weeklyTarget?: number;
      color?: string;
      icon?: string;
    },
  ) {
    return this.habits.create(body ?? {});
  }

  /** Réordonne les habitudes (drag & drop). Doit précéder la route paramétrée. */
  @Put('reorder')
  reorder(@Body() body: { ids: string[] }) {
    return this.habits.reorder(body?.ids);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      weeklyTarget?: number;
      color?: string;
      icon?: string;
    },
  ) {
    return this.habits.update(id, body ?? {});
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.habits.archive(id);
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.habits.unarchive(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.habits.remove(id);
    return { ok: true };
  }

  /** Coche / décoche une cellule (habitude × jour). Renvoie les stats à jour. */
  @Put(':id/checks/:date')
  async setCheck(
    @Param('id') id: string,
    @Param('date') date: string,
    @Body() body: { checked?: boolean },
    @Query('today') today?: string,
  ) {
    const stats = await this.habits.setCheck(
      id,
      date,
      body?.checked ?? true,
      today,
    );
    return {
      stats,
      milestones: this.habits.milestonesForStreak(
        stats.currentStreak,
        stats.streakUnit,
      ),
    };
  }
}
