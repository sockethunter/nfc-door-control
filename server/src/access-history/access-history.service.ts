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
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AccessHistoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.accessHistory.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          door: true,
        },
      }),
      this.prisma.accessHistory.count(),
    ]);

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findByDoor(doorId: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.accessHistory.findMany({
        where: { doorId },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          door: true,
        },
      }),
      this.prisma.accessHistory.count({ where: { doorId } }),
    ]);

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findByTag(tagId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.prisma.accessHistory.findMany({
        where: { tagId },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          door: true,
        },
      }),
      this.prisma.accessHistory.count({ where: { tagId } }),
    ]);

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const [totalAccess, successfulAccess, failedAccess] = await Promise.all([
      this.prisma.accessHistory.count(),
      this.prisma.accessHistory.count({ where: { accessGranted: true } }),
      this.prisma.accessHistory.count({ where: { accessGranted: false } }),
    ]);

    return {
      totalAccess,
      successfulAccess,
      failedAccess,
      successRate: totalAccess > 0 ? (successfulAccess / totalAccess) * 100 : 0,
    };
  }

  async delete(id: number) {
    return this.prisma.accessHistory.delete({
      where: { id },
    });
  }
}