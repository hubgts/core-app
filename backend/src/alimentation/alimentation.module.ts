import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlimentationController } from './alimentation.controller';
import { AlimentationService } from './alimentation.service';
import { RecipeEntity } from './entities/recipe.entity';
import { MealTypeEntity } from './entities/meal-type.entity';
import { FoodEntity } from './entities/food.entity';
import { MealLogEntryEntity } from './entities/meal-log-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecipeEntity,
      MealTypeEntity,
      FoodEntity,
      MealLogEntryEntity,
    ]),
  ],
  controllers: [AlimentationController],
  providers: [AlimentationService],
})
export class AlimentationModule {}
