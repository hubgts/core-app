import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BettingController } from './betting.controller';
import { BettingService } from './betting.service';
import { BankrollEntity } from './entities/bankroll.entity';
import { BetEntity } from './entities/bet.entity';
import { SelectionEntity } from './entities/selection.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BankrollEntity, BetEntity, SelectionEntity]),
  ],
  controllers: [BettingController],
  providers: [BettingService],
})
export class BettingModule {}
