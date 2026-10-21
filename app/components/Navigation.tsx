'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Stock Tracker
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                {/* Dropdown Trigger Button */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                >
                  <span>
                    Welcome
                    {user.displayName ? (
                      <>
                        , <span className="font-bold">{user.displayName}</span>
                      </>
                    ) : (
                      ' Back'
                    )}
                  </span>
                  {/* Small Arrow Icon */}
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Overlay & Card */}
                {isOpen && (
                  <>
                    {/* Invisible backdrop to close the dropdown when clicking outside */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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