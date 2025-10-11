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
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms';
import LanguageToggle from '../atoms/LanguageToggle';
import ThemeToggle from '../atoms/ThemeToggle';

interface NavigationProps {
  user?: { username: string; role: string };
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  user,
  currentPath,
  onNavigate,
  onLogout
}) => {
  const { t } = useTranslation();
  
  const navItems = [
    { path: '/', label: t('navigation.dashboard'), icon: '📊' },
    { path: '/doors', label: t('navigation.doors'), icon: '🚪' },
    { path: '/tags', label: t('navigation.tags'), icon: '🏷️' },
    { path: '/history', label: t('navigation.history'), icon: '📈' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                🔐 NFC Door Control
              </h1>
            </div>
            <div className="ml-10 flex space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${
                    currentPath === item.path
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <LanguageToggle />
            {user && (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('common.login')}, <span className="font-medium">{user.username}</span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onLogout}
                >
                  {t('common.logout')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};