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
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DoorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.door.findMany({
      include: {
        permissions: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            accessHistory: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const door = await this.prisma.door.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            tag: true,
          },
        },
        accessHistory: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!door) {
      throw new NotFoundException(`Door with ID ${id} not found`);
    }

    return door;
  }

  async create(data: { name: string; location?: string; clientId: string }) {
    return this.prisma.door.create({
      data,
    });
  }

  async update(id: number, data: { name?: string; location?: string; clientId?: string; isActive?: boolean }) {
    return this.prisma.door.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.door.delete({
      where: { id },
    });
  }
}