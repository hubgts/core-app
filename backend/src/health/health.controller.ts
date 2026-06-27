import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { GoalInput, MeasurementInput, ProfileInput } from './types';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Vue d'ensemble : profil, mesures, séries lissées, objectif, KPIs. */
  @Get()
  overview(@Query('today') today?: string) {
    return this.health.overview(today);
  }

  /** Crée / met à jour la mesure du jour `date` (upsert). */
  @Put('measurements/:date')
  setMeasurement(
    @Param('date') date: string,
    @Body() body: MeasurementInput,
    @Query('today') today?: string,
  ) {
    return this.health.setMeasurement(date, body ?? {}, today);
  }

  @Delete('measurements/:id')
  removeMeasurement(@Param('id') id: string, @Query('today') today?: string) {
    return this.health.removeMeasurement(id, today);
  }

  @Put('profile')
  updateProfile(@Body() body: ProfileInput, @Query('today') today?: string) {
    return this.health.updateProfile(body ?? {}, today);
  }

  @Put('goal')
  setGoal(@Body() body: GoalInput, @Query('today') today?: string) {
    return this.health.setGoal(body ?? {}, today);
  }

  @Delete('goal')
  clearGoal(@Query('today') today?: string) {
    return this.health.clearGoal(today);
  }
}
