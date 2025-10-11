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
import { useTranslation } from 'react-i18next';
import { LoginForm } from '../components/molecules';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await onLogin(username, password);
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Better error messages based on status code
      if (err.response?.status === 401) {
        setError(t('auth.invalidCredentials'));
      } else if (err.response?.status >= 500) {
        setError(t('errors.serverError'));
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('fetch')) {
        setError(t('errors.networkError'));
      } else {
        setError(err.message || t('errors.networkError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={loading}
      error={error || undefined}
    />
  );
};