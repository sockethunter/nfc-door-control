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
import { Card } from '../atoms';
import { AccessStats } from '../../types';

interface DashboardStatsProps {
  stats: AccessStats;
  loading?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Gesamte Zugriffe',
      value: stats.totalAccess.toLocaleString(),
      icon: '📊',
      color: 'text-primary-600'
    },
    {
      title: 'Erfolgreiche Zugriffe',
      value: stats.successfulAccess.toLocaleString(),
      icon: '✅',
      color: 'text-success-600'
    },
    {
      title: 'Fehlgeschlagene Zugriffe',
      value: stats.failedAccess.toLocaleString(),
      icon: '❌',
      color: 'text-danger-600'
    },
    {
      title: 'Erfolgsrate',
      value: `${stats.successRate.toFixed(1)}%`,
      icon: '📈',
      color: 'text-success-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <div className="flex items-center">
            <div className={`text-2xl ${stat.color} mr-4`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};