import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipeEntity } from '../alimentation/entities/recipe.entity';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { AisleEntity } from './entities/aisle.entity';
import { ArticleEntity } from './entities/article.entity';
import { ShoppingListEntity } from './entities/shopping-list.entity';
import { ShoppingTemplateEntity } from './entities/shopping-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AisleEntity,
      ArticleEntity,
      ShoppingListEntity,
      ShoppingTemplateEntity,
      // Recettes en lecture seule pour l'import (module Alimentation).
      RecipeEntity,
    ]),
  ],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
