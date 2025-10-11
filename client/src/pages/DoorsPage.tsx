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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doorsApi } from '../services/api';
import { Door } from '../types';
import { Button, Input, Card } from '../components/atoms';
import { DoorCard } from '../components/molecules';

export const DoorsPage: React.FC = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingDoor, setEditingDoor] = useState<Door | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    clientId: ''
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: doors = [], isLoading } = useQuery({
    queryKey: ['doors'],
    queryFn: doorsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: doorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doors'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Door> }) =>
      doorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doors'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: doorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doors'] });
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      alert(t('errors.serverError'));
    },
  });

  const resetForm = () => {
    setFormData({ name: '', location: '', clientId: '' });
    setEditingDoor(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDoor) {
      updateMutation.mutate({ id: editingDoor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (door: Door) => {
    setFormData({
      name: door.name,
      location: door.location || '',
      clientId: door.clientId
    });
    setEditingDoor(door);
    setShowForm(true);
  };

  const handleDelete = (door: Door) => {
    if (confirm(`${t('doors.confirmDelete')}`)) {
      deleteMutation.mutate(door.id);
    }
  };

  const handleToggleActive = (door: Door) => {
    updateMutation.mutate({ 
      id: door.id, 
      data: { isActive: !door.isActive }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('doors.title')}</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('doors.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('doors.title')}</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? t('common.cancel') : t('doors.addDoor')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {editingDoor ? t('doors.editDoor') : t('doors.addDoor')}
            </h3>
            
            <Input
              label={t('doors.doorName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="z.B. Haupteingang"
            />
            
            <Input
              label={t('doors.location')}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="z.B. Erdgeschoss, Bürobereich"
            />
            
            <Input
              label={t('doors.clientId')}
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
              placeholder="z.B. door-001"
              helpText={t('doors.clientId')}
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingDoor ? t('common.save') : t('common.add')}
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
        {doors.map((door) => (
          <DoorCard
            key={door.id}
            door={door}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewHistory={(door) => navigate(`/history?door=${door.id}`)}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>

      {doors.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">🚪</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('doors.noDoors')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('doors.addDoor')}
            </p>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              {t('doors.addDoor')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};