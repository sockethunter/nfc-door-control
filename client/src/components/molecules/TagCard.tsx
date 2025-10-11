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
import { NfcTag } from '../../types';

interface TagCardProps {
  tag: NfcTag;
  onEdit?: (tag: NfcTag) => void;
  onDelete?: (tag: NfcTag) => void;
  onAssignDoors?: (tag: NfcTag) => void;
  onToggleActive?: (tag: NfcTag) => void;
}

export const TagCard: React.FC<TagCardProps> = ({
  tag,
  onEdit,
  onDelete,
  onAssignDoors,
  onToggleActive
}) => {
  return (
    <Card>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">
            {tag.name || 'Unbenannter Tag'}
          </h3>
          {tag.ownerName && (
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-sm">Besitzer: {tag.ownerName}</p>
          )}
        </div>
        <Badge variant={tag.isActive ? 'success' : 'danger'}>
          {tag.isActive ? 'Aktiv' : 'Inaktiv'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-300 mb-4">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-200">Tag ID:</span> 
          <code className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded text-xs">
            {tag.tagId}
          </code>
        </div>
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-200">Berechtigte Türen:</span> {tag.permissions?.length || 0}
        </div>
        {tag.permissions && tag.permissions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tag.permissions.map((permission) => (
              <Badge key={permission.id} variant="info" size="sm">
                {permission.door?.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {onEdit && (
          <Button size="sm" variant="secondary" onClick={() => onEdit(tag)}>
            Bearbeiten
          </Button>
        )}
        {onAssignDoors && (
          <Button size="sm" variant="primary" onClick={() => onAssignDoors(tag)}>
            Türen
          </Button>
        )}
        {onToggleActive && (
          <Button 
            size="sm" 
            variant={tag.isActive ? "secondary" : "success"} 
            onClick={() => onToggleActive(tag)}
          >
            {tag.isActive ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="danger" onClick={() => onDelete(tag)}>
            Löschen
          </Button>
        )}
      </div>
    </Card>
  );
};