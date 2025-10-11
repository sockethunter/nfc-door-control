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
import React from 'react';
import { Card, Badge, Button } from '../atoms';
import { Door } from '../../types';

interface DoorCardProps {
  door: Door;
  onEdit?: (door: Door) => void;
  onDelete?: (door: Door) => void;
  onViewHistory?: (door: Door) => void;
  onToggleActive?: (door: Door) => void;
}

export const DoorCard: React.FC<DoorCardProps> = ({
  door,
  onEdit,
  onDelete,
  onViewHistory,
  onToggleActive
}) => {
  return (
    <Card>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">{door.name}</h3>
          {door.location && (
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-sm">{door.location}</p>
          )}
        </div>
        <Badge variant={door.isActive ? 'success' : 'danger'}>
          {door.isActive ? 'Aktiv' : 'Inaktiv'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300 mb-4">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-200">Client ID:</span> {door.clientId}
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-200">Berechtigungen:</span> {door.permissions?.length || 0}
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-200">Zugriffe:</span> {door._count?.accessHistory || 0}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {onEdit && (
          <Button size="sm" variant="secondary" onClick={() => onEdit(door)}>
            Bearbeiten
          </Button>
        )}
        {onViewHistory && (
          <Button size="sm" variant="primary" onClick={() => onViewHistory(door)}>
            History
          </Button>
        )}
        {onToggleActive && (
          <Button 
            size="sm" 
            variant={door.isActive ? "secondary" : "success"} 
            onClick={() => onToggleActive(door)}
          >
            {door.isActive ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="danger" onClick={() => onDelete(door)}>
            Löschen
          </Button>
        )}
      </div>
    </Card>
  );
};