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
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tagsApi, doorsApi } from '../services/api';
import { NfcTag, Door } from '../types';
import { Button, Input, Card, Badge } from '../components/atoms';
import { TagCard } from '../components/molecules';

export const TagsPage: React.FC = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<NfcTag | null>(null);
  const [showDoorAssignment, setShowDoorAssignment] = useState(false);
  const [assigningTag, setAssigningTag] = useState<NfcTag | null>(null);
  const [formData, setFormData] = useState({
    tagId: '',
    name: '',
    ownerName: ''
  });

  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const { data: doors = [] } = useQuery({
    queryKey: ['doors'],
    queryFn: doorsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NfcTag> }) =>
      tagsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tagsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const assignDoorMutation = useMutation({
    mutationFn: ({ tagId, doorId }: { tagId: number; doorId: number }) =>
      tagsApi.assignToDoor(tagId, doorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error: any) => {
      console.error('Assign error:', error);
      alert(t('errors.serverError'));
    },
  });

  const removeDoorMutation = useMutation({
    mutationFn: ({ tagId, doorId }: { tagId: number; doorId: number }) =>
      tagsApi.removeFromDoor(tagId, doorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error: any) => {
      console.error('Remove error:', error);
      alert(t('errors.serverError'));
    },
  });

  const resetForm = () => {
    setFormData({ tagId: '', name: '', ownerName: '' });
    setEditingTag(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      const updateData = { name: formData.name, ownerName: formData.ownerName };
      updateMutation.mutate({ id: editingTag.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (tag: NfcTag) => {
    setFormData({
      tagId: tag.tagId,
      name: tag.name || '',
      ownerName: tag.ownerName || ''
    });
    setEditingTag(tag);
    setShowForm(true);
  };

  const handleDelete = (tag: NfcTag) => {
    if (confirm(`${t('tags.confirmDelete')}`)) {
      deleteMutation.mutate(tag.id);
    }
  };

  const handleToggleActive = (tag: NfcTag) => {
    updateMutation.mutate({ 
      id: tag.id, 
      data: { isActive: !tag.isActive }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tags.title')}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tags.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('tags.title')}</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? t('common.cancel') : t('tags.addTag')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {editingTag ? t('tags.editTag') : t('tags.addTag')}
            </h3>
            
            <Input
              label={t('tags.tagId')}
              value={formData.tagId}
              onChange={(e) => setFormData({ ...formData, tagId: e.target.value.toUpperCase() })}
              required={!editingTag}
              disabled={!!editingTag}
              placeholder="z.B. ABC123DEF"
              helpText={t('tags.tagId')}
            />
            
            <Input
              label={t('tags.tagName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Mitarbeiter-Tag, Besucher-Tag"
            />
            
            <Input
              label={t('tags.ownerName')}
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              placeholder="z.B. Max Mustermann"
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingTag ? t('common.save') : t('common.add')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAssignDoors={(tag) => {
              setAssigningTag(tag);
              setShowDoorAssignment(true);
            }}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>

      {tags.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">🏷️</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('tags.noTags')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('tags.addTag')}
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              {t('tags.addTag')}
            </Button>
          </div>
        </Card>
      )}

      {/* Door Assignment Modal */}
      {showDoorAssignment && assigningTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('tags.assignToDoors')} "{assigningTag.name || assigningTag.tagId}"
            </h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {doors.map((door) => {
                // Get current tag data from the live query instead of static state
                const currentTag = tags.find(t => t.id === assigningTag.id);
                const isAssigned = currentTag?.permissions?.some(p => p.doorId === door.id) || false;
                return (
                  <div key={door.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{door.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{door.location}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isAssigned ? 'success' : 'default'} size="sm">
                        {isAssigned ? t('tags.assignedDoors') : t('common.active')}
                      </Badge>
                      {isAssigned ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeDoorMutation.mutate({ 
                            tagId: assigningTag.id, 
                            doorId: door.id 
                          })}
                          loading={removeDoorMutation.isPending}
                          disabled={assignDoorMutation.isPending}
                        >
                          {t('common.delete')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => assignDoorMutation.mutate({ 
                            tagId: assigningTag.id, 
                            doorId: door.id 
                          })}
                          loading={assignDoorMutation.isPending}
                          disabled={removeDoorMutation.isPending}
                        >
                          {t('common.add')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDoorAssignment(false);
                  setAssigningTag(null);
                }}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};