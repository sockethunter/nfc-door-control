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
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTagDto, UpdateTagDto, ValidateTagDto } from '../dto/tag.dto';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post('validate')
  async validateAccess(@Body() validateDto: ValidateTagDto) {
    const result = await this.tagsService.validateTagAccess(validateDto.tagId, validateDto.clientId, validateDto.image);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.delete(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':tagId/doors/:doorId')
  assignToDoor(@Param('tagId', ParseIntPipe) tagId: number, @Param('doorId', ParseIntPipe) doorId: number) {
    return this.tagsService.assignToDoor(tagId, doorId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':tagId/doors/:doorId')
  removeFromDoor(@Param('tagId', ParseIntPipe) tagId: number, @Param('doorId', ParseIntPipe) doorId: number) {
    return this.tagsService.removeFromDoor(tagId, doorId);
  }
}