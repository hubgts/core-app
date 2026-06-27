import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlimentationController } from './alimentation.controller';
import { AlimentationService } from './alimentation.service';
import { RecipeEntity } from './entities/recipe.entity';
import { MealTypeEntity } from './entities/meal-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecipeEntity, MealTypeEntity])],
  controllers: [AlimentationController],
  providers: [AlimentationService],
})
export class AlimentationModule {}
