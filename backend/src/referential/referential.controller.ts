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
import { ReferentialService } from './referential.service';
import { ReferenceItemInput } from './types';

@Controller('referential')
export class ReferentialController {
  constructor(private readonly referential: ReferentialService) {}

  @Get(':kind')
  list(@Param('kind') kind: string, @Query('q') q?: string) {
    return this.referential.list(kind, q);
  }

  @Post(':kind')
  create(@Param('kind') kind: string, @Body() body: ReferenceItemInput) {
    return this.referential.create(kind, body ?? {});
  }

  @Patch(':kind/:id')
  update(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() body: ReferenceItemInput,
  ) {
    return this.referential.update(kind, id, body ?? {});
  }

  @Delete(':kind/:id')
  async remove(@Param('kind') kind: string, @Param('id') id: string) {
    await this.referential.remove(kind, id);
    return { ok: true };
  }
}
