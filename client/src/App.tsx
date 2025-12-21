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
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from './services/api';
import { User } from './types';
import { Navigation } from './components/organisms';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DoorsPage } from './pages/DoorsPage';
import { TagsPage } from './pages/TagsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AlarmsPage } from './pages/AlarmsPage';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authApi.getProfile()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('auth_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    localStorage.setItem('auth_token', response.access_token);
    setUser(response.user);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <LoginPage onLogin={handleLogin} />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation
          user={user}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/doors" element={<DoorsPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/alarms" element={<AlarmsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;