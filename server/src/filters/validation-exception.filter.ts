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
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Handle class-validator errors
    if (typeof exceptionResponse === 'object' && exceptionResponse['message']) {
      const validationErrors = exceptionResponse['message'];
      
      return response.status(status).json({
        statusCode: status,
        error: 'Validation Error',
        message: Array.isArray(validationErrors) ? validationErrors : [validationErrors],
        timestamp: new Date().toISOString(),
      });
    }

    // Default handling
    return response.status(status).json({
      statusCode: status,
      error: 'Bad Request',
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}