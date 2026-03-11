'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await login(email, password);
      if (!credential.user.emailVerified) {
        router.push('/verify-email');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError('Failed to login: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#0f2640] mb-6">Login</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#0f2640] mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0f2640] mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-center text-[#6b7280]">
        Don't have an account?{' '}
        <Link href="/signup" className="text-[#ff7a2d] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
