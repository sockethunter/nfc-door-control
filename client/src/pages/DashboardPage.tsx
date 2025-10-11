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
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { accessHistoryApi, doorsApi, tagsApi } from '../services/api';
import { DashboardStats } from '../components/organisms';
import { Card, Button, Badge } from '../components/atoms';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['access-stats'],
    queryFn: accessHistoryApi.getStats,
  });

  const { data: doors = [] } = useQuery({
    queryKey: ['doors'],
    queryFn: doorsApi.getAll,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const { data: recentHistory } = useQuery({
    queryKey: ['recent-history'],
    queryFn: () => accessHistoryApi.getAll(1, 5),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.title')}</p>
      </div>

      <DashboardStats
        stats={stats || { totalAccess: 0, successfulAccess: 0, failedAccess: 0, successRate: 0 }}
        loading={isLoading}
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="text-2xl text-primary-600 mr-4">🚪</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('navigation.doors')}</p>
              <p className="text-2xl font-bold text-gray-900">{doors.length}</p>
              <p className="text-xs text-gray-500">
                {doors.filter(d => d.isActive).length} {t('common.active').toLowerCase()}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="text-2xl text-success-600 mr-4">🏷️</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('navigation.tags')}</p>
              <p className="text-2xl font-bold text-gray-900">{tags.length}</p>
              <p className="text-xs text-gray-500">
                {tags.filter(t => t.isActive).length} {t('common.active').toLowerCase()}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="text-2xl text-primary-600 mr-4">🔗</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('tags.assignedDoors')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {tags.reduce((total, tag) => total + (tag.permissions?.length || 0), 0)}
              </p>
              <p className="text-xs text-gray-500">{t('tags.assignedDoors')}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard.title')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('common.active')}</span>
              <Badge variant="success">🟢 {t('common.active')}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('common.active')}</span>
              <Badge variant="success">🟢 {t('common.active')}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('dashboard.activeDoors')}</span>
              <Badge variant="info">{doors.filter(d => d.isActive).length}/{doors.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('dashboard.activeTags')}</span>
              <Badge variant="info">{tags.filter(t => t.isActive).length}/{tags.length}</Badge>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('common.add')}</h3>
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full justify-start"
              onClick={() => navigate('/doors')}
            >
              🚪 {t('doors.addDoor')}
            </Button>
            <Button
              variant="primary"
              className="w-full justify-start"
              onClick={() => navigate('/tags')}
            >
              🏷️ {t('tags.addTag')}
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => navigate('/history')}
            >
              📊 {t('history.title')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentHistory && recentHistory.data.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.recentAccess')}</h3>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/history')}
            >
              {t('history.title')}
            </Button>
          </div>
          <div className="space-y-3">
            {recentHistory.data.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${entry.accessGranted ? 'bg-success-500' : 'bg-danger-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.door.name}</p>
                    <p className="text-xs text-gray-500">{t('history.tag')}: {entry.tagId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={entry.accessGranted ? 'success' : 'danger'} size="sm">
                    {entry.accessGranted ? t('dashboard.granted') : t('dashboard.denied')}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(entry.timestamp).toLocaleString('de-DE', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};