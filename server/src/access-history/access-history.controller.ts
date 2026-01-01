/*
 * Copyright (c) 2025 sockethunter
 *
 * This file is part of nfc-door-control 
 * (see https://github.com/sockethunter/nfc-door-control).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import { Controller, Get, Query, Param, UseGuards, ParseIntPipe, Delete } from '@nestjs/common';
import { AccessHistoryService } from './access-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccessHistoryQueryDto } from '../dto/access-history.dto';

@Controller('access-history')
@UseGuards(JwtAuthGuard)
export class AccessHistoryController {
  constructor(private readonly accessHistoryService: AccessHistoryService) {}

  @Get()
  findAll(@Query() query: AccessHistoryQueryDto) {
    return this.accessHistoryService.findAll(query.page, query.limit);
  }

  @Get('stats')
  getStats() {
    return this.accessHistoryService.getStats();
  }

  @Get('door/:doorId')
  findByDoor(
    @Param('doorId', ParseIntPipe) doorId: number,
    @Query() query: AccessHistoryQueryDto
  ) {
    return this.accessHistoryService.findByDoor(doorId, query.page, query.limit);
  }

  @Get('tag/:tagId')
  findByTag(
    @Param('tagId') tagId: string,
    @Query() query: AccessHistoryQueryDto
  ) {
    return this.accessHistoryService.findByTag(tagId, query.page, query.limit);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.accessHistoryService.delete(id);
  }
}