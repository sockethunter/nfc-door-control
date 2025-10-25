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
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async validateTagAccess(tagId: string, clientId: string, image?: string): Promise<{ allowed: boolean; doorId?: number }> {
    const door = await this.prisma.door.findUnique({
      where: { clientId, isActive: true },
    });

    if (!door) {
      // Log failed attempt even when door is not found
      console.log(`Access denied: Door not found for clientId: ${clientId}, tagId: ${tagId}`);
      
      // Try to find any door with this clientId (even inactive) to log the attempt
      const anyDoor = await this.prisma.door.findUnique({
        where: { clientId },
      });

      if (anyDoor) {
        // Log to inactive door
        try {
          await this.prisma.accessHistory.create({
            data: {
              doorId: anyDoor.id,
              tagId,
              accessGranted: false,
              clientIp: null,
              image: image || null,
            },
          });
        } catch (error) {
          console.error('Failed to log access history:', error);
        }
        return { allowed: false, doorId: anyDoor.id };
      }
      
      return { allowed: false };
    }

    const tag = await this.prisma.nfcTag.findUnique({
      where: { tagId, isActive: true },
      include: {
        permissions: {
          where: {
            doorId: door.id,
            isActive: true,
          },
        },
      },
    });

    const allowed = !!(tag && tag.permissions.length > 0);
    
    // Always log access attempts (both successful and failed)
    try {
      await this.prisma.accessHistory.create({
        data: {
          doorId: door.id,
          tagId,
          accessGranted: allowed,
          clientIp: null,
          image: image || null,
        },
      });
    } catch (error) {
      console.error('Failed to log access history:', error);
      // Don't fail the validation if logging fails
    }

    // Log details for monitoring
    if (allowed) {
      console.log(`Access granted: tagId: ${tagId}, door: ${door.name} (${door.clientId})`);
    } else {
      if (!tag) {
        console.log(`Access denied: Tag not found or inactive: ${tagId} for door: ${door.name}`);
      } else {
        console.log(`Access denied: Tag ${tagId} has no permission for door: ${door.name}`);
      }
    }

    return { allowed, doorId: door.id };
  }

  async findAll() {
    return this.prisma.nfcTag.findMany({
      include: {
        permissions: {
          include: {
            door: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const tag = await this.prisma.nfcTag.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            door: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async create(data: { tagId: string; name?: string; ownerName?: string }) {
    return this.prisma.nfcTag.create({
      data,
    });
  }

  async update(id: number, data: { name?: string; ownerName?: string; isActive?: boolean }) {
    return this.prisma.nfcTag.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.nfcTag.delete({
      where: { id },
    });
  }

  async assignToDoor(tagId: number, doorId: number) {
    return this.prisma.doorPermission.create({
      data: {
        tagId,
        doorId,
      },
    });
  }

  async removeFromDoor(tagId: number, doorId: number) {
    return this.prisma.doorPermission.deleteMany({
      where: {
        tagId,
        doorId,
      },
    });
  }
}