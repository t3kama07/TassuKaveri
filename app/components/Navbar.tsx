'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showRequestsMenu, setShowRequestsMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="TassuKaveri" 
              width={120} 
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {user ? (
              user.emailVerified ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/pets" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Pets
                  </Link>
                  
                  {/* Requests Dropdown */}
                  <div 
                    className="relative"
                    onMouseEnter={() => setShowRequestsMenu(true)}
                    onMouseLeave={() => setShowRequestsMenu(false)}
                  >
                    <button className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium flex items-center gap-1 py-2">
                      Requests
                      <svg 
                        className="w-4 h-4" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showRequestsMenu && (
                      <div className="absolute top-full left-0 pt-2 w-48 z-50">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                          <Link
                            href="/requests"
                            className="block px-4 py-2 text-[#0f2640] hover:bg-gray-50 hover:text-[#ff7a2d] transition-colors"
                          >
                            My Requests
                          </Link>
                          <Link
                            href="/requests/browse"
                            className="block px-4 py-2 text-[#0f2640] hover:bg-gray-50 hover:text-[#ff7a2d] transition-colors"
                          >
                            Browse Requests
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Link 
                    href="/sitters" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Sitters
                  </Link>
                  
                  <Link 
                    href="/messages" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Messages
                  </Link>
                  <Link 
                    href="/notifications" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Notifications
                  </Link>
                  <Link 
                    href="/profile" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Profile
                  </Link>
                  <Link 
                    href="/admin" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Admin
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="bg-[#ff7a2d] text-white px-4 py-2 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/verify-email" 
                    className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                  >
                    Verify Email
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="bg-[#ff7a2d] text-white px-4 py-2 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
                  >
                    Logout
                  </button>
                </>
              )
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-[#ff7a2d] text-white px-4 py-2 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
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
