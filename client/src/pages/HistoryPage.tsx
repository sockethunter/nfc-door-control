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
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { accessHistoryApi } from '../services/api';
import { Card, Badge, Button } from '../components/atoms';

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const doorFilter = searchParams.get('door');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['access-history', page, doorFilter],
    queryFn: () => {
      if (doorFilter) {
        return accessHistoryApi.getByDoor(parseInt(doorFilter), page, limit);
      }
      return accessHistoryApi.getAll(page, limit);
    },
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('history.title')}</h1>
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('history.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {doorFilter ? 
            `${t('history.filterByDoor')} (ID: ${doorFilter})` : 
            t('history.title')
          }
        </p>
        {doorFilter && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.history.pushState({}, '', '/history')}
            className="mt-2"
          >
            {t('history.allDoors')}
          </Button>
        )}
      </div>

      {data && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('common.loading')} {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} / {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= data.pages}
                onClick={() => setPage(page + 1)}
              >
                {t('common.add')}
              </Button>
            </div>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('history.timestamp')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('history.door')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('history.tag')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('history.result')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('history.clientIp')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.data.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDateTime(entry.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.door.name}
                          </div>
                          {entry.door.location && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {entry.door.location}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {entry.tagId}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={entry.accessGranted ? 'success' : 'danger'}>
                          {entry.accessGranted ? `✅ ${t('history.accessGranted')}` : `❌ ${t('history.accessDenied')}`}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {entry.clientIp || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {data.data.length === 0 && (
            <Card className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('history.noHistory')}</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('history.noHistory')}
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};