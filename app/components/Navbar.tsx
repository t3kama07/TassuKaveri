'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

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
                <Link 
                  href="/requests" 
                  className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                >
                  Requests
                </Link>
                <Link 
                  href="/messages" 
                  className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                >
                  Messages
                </Link>
                <Link 
                  href="/profile" 
                  className="text-[#0f2640] hover:text-[#ff7a2d] transition-colors font-medium"
                >
                  Profile
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
