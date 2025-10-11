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
export interface User {
  id: number;
  username: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Door {
  id: number;
  name: string;
  location?: string;
  clientId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: DoorPermission[];
  _count?: {
    accessHistory: number;
  };
}

export interface NfcTag {
  id: number;
  tagId: string;
  name?: string;
  ownerName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: DoorPermission[];
}

export interface DoorPermission {
  id: number;
  doorId: number;
  tagId: number;
  isActive: boolean;
  createdAt: string;
  door?: Door;
  tag?: NfcTag;
}

export interface AccessHistory {
  id: number;
  doorId: number;
  tagId: string;
  accessGranted: boolean;
  timestamp: string;
  clientIp?: string;
  door: Door;
}

export interface AccessHistoryResponse {
  data: AccessHistory[];
  total: number;
  page: number;
  pages: number;
}

export interface AccessStats {
  totalAccess: number;
  successfulAccess: number;
  failedAccess: number;
  successRate: number;
}