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
import { FinancesService } from './finances.service';
import {
  BulkSnapshotInput,
  EnvelopeInput,
  SettingsInput,
  SnapshotInput,
} from './types';

@Controller('finances')
export class FinancesController {
  constructor(private readonly finances: FinancesService) {}

  /** Vue d'ensemble : net, répartition, plus-values, courbe d'évolution. */
  @Get('overview')
  overview(
    @Query('months') months?: string,
    @Query('today') today?: string,
    @Query('projection') projection?: string,
  ) {
    return this.finances.overview(months, today, projection);
  }

  /** Réglages globaux (objectif de patrimoine net). */
  @Get('settings')
  getSettings() {
    return this.finances.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() body: SettingsInput) {
    return this.finances.updateSettings(body ?? {});
  }

  /** Bilan du mois : relevé groupé à une date pour plusieurs enveloppes. */
  @Post('snapshots/bulk')
  bulkSnapshots(@Body() body: BulkSnapshotInput) {
    return this.finances.bulkSetSnapshots(body ?? {});
  }

  /** Liste des enveloppes décorées (soldes courants + stats). */
  @Get('envelopes')
  list(@Query('includeArchived') includeArchived?: string) {
    return this.finances.listEnvelopes(includeArchived === 'true');
  }

  @Post('envelopes')
  create(@Body() body: EnvelopeInput) {
    return this.finances.create(body ?? {});
  }

  /** Réordonne les enveloppes. Doit précéder les routes paramétrées. */
  @Put('envelopes/reorder')
  reorder(@Body() body: { ids: string[] }) {
    return this.finances.reorder(body?.ids);
  }

  @Get('envelopes/:id')
  detail(@Param('id') id: string) {
    return this.finances.getEnvelope(id);
  }

  @Patch('envelopes/:id')
  update(@Param('id') id: string, @Body() body: EnvelopeInput) {
    return this.finances.update(id, body ?? {});
  }

  @Post('envelopes/:id/archive')
  archive(@Param('id') id: string) {
    return this.finances.archive(id);
  }

  @Post('envelopes/:id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.finances.unarchive(id);
  }

  @Delete('envelopes/:id')
  async remove(@Param('id') id: string) {
    await this.finances.remove(id);
    return { ok: true };
  }

  /** Crée/écrase le relevé d'une enveloppe à une date (upsert). */
  @Put('envelopes/:id/snapshots/:date')
  setSnapshot(
    @Param('id') id: string,
    @Param('date') date: string,
    @Body() body: SnapshotInput,
  ) {
    return this.finances.setSnapshot(id, date, body ?? {});
  }

  @Delete('snapshots/:id')
  removeSnapshot(@Param('id') id: string) {
    return this.finances.removeSnapshot(id);
  }
}
