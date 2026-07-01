import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlimentationController } from './alimentation.controller';
import { AlimentationService } from './alimentation.service';
import { RecipeEntity } from './entities/recipe.entity';
import { MealTypeEntity } from './entities/meal-type.entity';
import { FoodEntity } from './entities/food.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecipeEntity, MealTypeEntity, FoodEntity]),
  ],
  controllers: [AlimentationController],
  providers: [AlimentationService],
})
export class AlimentationModule {}
