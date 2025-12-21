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
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReportTamperDto, UpdateTamperLogDto } from '../dto/alarm.dto';

@Injectable()
export class AlarmService {
  private readonly logger = new Logger(AlarmService.name);

  constructor(private readonly db: PrismaService) {}

  async reportTamper(reportDto: ReportTamperDto) {
    this.logger.warn(`Tamper attempt reported from client: ${reportDto.clientId}`);

    const tamperLog = await this.db.tamperLog.create({
      data: {
        clientId: reportDto.clientId,
        image: reportDto.image,
        timestamp: reportDto.timestamp ? new Date(reportDto.timestamp) : new Date(),
      },
    });

    this.logger.log(`Tamper log created with ID: ${tamperLog.id}`);

    // TODO: Add notification logic here (email, push notification, etc.)

    return {
      success: true,
      message: 'Tamper attempt logged successfully',
      logId: tamperLog.id,
    };
  }

  async findAll() {
    return this.db.tamperLog.findMany({
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.db.tamperLog.findUnique({
      where: { id },
    });
  }

  async findByClientId(clientId: string) {
    return this.db.tamperLog.findMany({
      where: { clientId },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async findUnresolved() {
    return this.db.tamperLog.findMany({
      where: { resolved: false },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async update(id: number, updateDto: UpdateTamperLogDto) {
    return this.db.tamperLog.update({
      where: { id },
      data: updateDto,
    });
  }

  async markAsResolved(id: number, notes?: string) {
    return this.db.tamperLog.update({
      where: { id },
      data: {
        resolved: true,
        notes,
      },
    });
  }

  async delete(id: number) {
    return this.db.tamperLog.delete({
      where: { id },
    });
  }

  async getStatistics() {
    const total = await this.db.tamperLog.count();
    const unresolved = await this.db.tamperLog.count({
      where: { resolved: false },
    });
    const resolved = await this.db.tamperLog.count({
      where: { resolved: true },
    });

    return {
      total,
      unresolved,
      resolved,
    };
  }
}
