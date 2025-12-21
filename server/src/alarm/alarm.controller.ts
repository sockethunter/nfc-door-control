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
import { AlarmService } from './alarm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportTamperDto, UpdateTamperLogDto } from '../dto/alarm.dto';

@Controller('alarm')
export class AlarmController {
  constructor(private readonly alarmService: AlarmService) {}

  @Post('tamper')
  async reportTamper(@Body() reportDto: ReportTamperDto) {
    return this.alarmService.reportTamper(reportDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tamper')
  async findAll(@Query('unresolved') unresolved?: string) {
    if (unresolved === 'true') {
      return this.alarmService.findUnresolved();
    }
    return this.alarmService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('tamper/statistics')
  async getStatistics() {
    return this.alarmService.getStatistics();
  }

  @UseGuards(JwtAuthGuard)
  @Get('tamper/client/:clientId')
  async findByClientId(@Param('clientId') clientId: string) {
    return this.alarmService.findByClientId(clientId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tamper/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.alarmService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tamper/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTamperLogDto) {
    return this.alarmService.update(id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tamper/:id/resolve')
  async markAsResolved(@Param('id', ParseIntPipe) id: number, @Body('notes') notes?: string) {
    return this.alarmService.markAsResolved(id, notes);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tamper/:id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.alarmService.delete(id);
  }
}
