'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Stock Tracker
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Welcome{user.displayName ? `, ${user.displayName}` : ''}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm text-white bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-md transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}