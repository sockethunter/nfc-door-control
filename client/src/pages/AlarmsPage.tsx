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
import { alarmApi } from '../services/api';
import { Card, Badge, Button } from '../components/atoms';
import { formatDateTime } from '../utils/dateTime';

interface TamperLog {
  id: number;
  clientId: string;
  timestamp: string;
  image?: string;
  resolved: boolean;
  notes?: string;
}

export const AlarmsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(true);
  const [selectedLog, setSelectedLog] = useState<TamperLog | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const { data: tamperLogs, isLoading } = useQuery<TamperLog[]>({
    queryKey: ['tamper-logs', showUnresolvedOnly],
    queryFn: () => alarmApi.getAll(showUnresolvedOnly),
  });

  const { data: stats } = useQuery({
    queryKey: ['tamper-stats'],
    queryFn: () => alarmApi.getStats(),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      alarmApi.markAsResolved(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tamper-logs'] });
      queryClient.invalidateQueries({ queryKey: ['tamper-stats'] });
      setSelectedLog(null);
      setResolveNotes('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => alarmApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tamper-logs'] });
      queryClient.invalidateQueries({ queryKey: ['tamper-stats'] });
    },
  });

  const handleResolve = (log: TamperLog) => {
    setSelectedLog(log);
  };

  const confirmResolve = () => {
    if (selectedLog) {
      resolveMutation.mutate({ id: selectedLog.id, notes: resolveNotes });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('alarms.title')}
        </h1>
        <Card className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('alarms.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('alarms.subtitle')}
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('alarms.totalAlarms')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('alarms.unresolved')}</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.unresolved}
              </p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('alarms.resolved')}</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.resolved}
              </p>
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          variant={showUnresolvedOnly ? 'primary' : 'secondary'}
          onClick={() => setShowUnresolvedOnly(true)}
        >
          {t('alarms.unresolvedOnly')}
        </Button>
        <Button
          variant={!showUnresolvedOnly ? 'primary' : 'secondary'}
          onClick={() => setShowUnresolvedOnly(false)}
        >
          {t('alarms.allAlarms')}
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          {tamperLogs && tamperLogs.length > 0 ? (
            tamperLogs.map((log) => (
              <div
                key={log.id}
                className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t('alarms.client')}: {log.clientId}
                      </h3>
                      <Badge variant={log.resolved ? 'success' : 'danger'}>
                        {log.resolved ? t('alarms.resolved') : t('alarms.unresolved')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDateTime(log.timestamp)}
                    </p>
                    {log.notes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        <span className="font-semibold">{t('alarms.notes')}</span> {log.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {log.image && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const win = window.open();
                          if (win) {
                            win.document.write(
                              `<img src="data:image/jpeg;base64,${log.image}" />`
                            );
                          }
                        }}
                      >
                        {t('alarms.viewImage')}
                      </Button>
                    )}
                    {!log.resolved && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResolve(log)}
                      >
                        {t('alarms.resolve')}
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(t('alarms.confirmDelete'))) {
                          deleteMutation.mutate(log.id);
                        }
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              {t('alarms.noAlarms')}
            </p>
          )}
        </div>
      </Card>

      {/* Resolve Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('alarms.resolveTitle')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('alarms.client')}: {selectedLog.clientId}
              <br />
              {formatDateTime(selectedLog.timestamp)}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('alarms.notes')}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={4}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder={t('alarms.notesPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={confirmResolve}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending ? t('alarms.resolving') : t('alarms.confirm')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedLog(null);
                  setResolveNotes('');
                }}
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
