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
import { BettingService } from './betting.service';
import { BankrollInput, BetInput, SettleBetInput } from './types';

@Controller('betting')
export class BettingController {
  constructor(private readonly betting: BettingService) {}

  // --- Bankrolls ---

  @Get('bankrolls')
  list(@Query('includeArchived') includeArchived?: string) {
    return this.betting.listBankrolls(includeArchived === 'true');
  }

  @Post('bankrolls')
  create(@Body() body: BankrollInput) {
    return this.betting.createBankroll(body ?? {});
  }

  @Get('bankrolls/:id')
  detail(@Param('id') id: string) {
    return this.betting.getBankroll(id);
  }

  @Patch('bankrolls/:id')
  update(@Param('id') id: string, @Body() body: BankrollInput) {
    return this.betting.updateBankroll(id, body ?? {});
  }

  @Post('bankrolls/:id/archive')
  archive(@Param('id') id: string) {
    return this.betting.archiveBankroll(id);
  }

  @Post('bankrolls/:id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.betting.unarchiveBankroll(id);
  }

  @Delete('bankrolls/:id')
  async remove(@Param('id') id: string) {
    await this.betting.removeBankroll(id);
    return { ok: true };
  }

  // --- Paris ---

  @Post('bankrolls/:id/bets')
  createBet(@Param('id') id: string, @Body() body: BetInput) {
    return this.betting.createBet(id, body ?? {});
  }

  @Patch('bets/:id')
  updateBet(@Param('id') id: string, @Body() body: BetInput) {
    return this.betting.updateBet(id, body ?? {});
  }

  @Post('bets/:id/settle')
  settleBet(@Param('id') id: string, @Body() body: SettleBetInput) {
    return this.betting.settleBet(id, body ?? {});
  }

  @Post('selections/:id/settle')
  settleSelection(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.betting.settleSelection(id, body?.status as never);
  }

  @Delete('bets/:id')
  removeBet(@Param('id') id: string) {
    return this.betting.removeBet(id);
  }
}
