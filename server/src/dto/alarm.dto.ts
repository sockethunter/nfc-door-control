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
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class ReportTamperDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @IsOptional()
  timestamp?: number;

  @IsString()
  @IsOptional()
  image?: string;  // Base64 encoded image
}

export class UpdateTamperLogDto {
  @IsBoolean()
  @IsOptional()
  resolved?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
