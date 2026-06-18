'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedLocation = location.trim();

    if (password !== confirmPassword) {
      return setError('The passwords do not match.');
    }

    setLoading(true);

    try {
      const result = await signup(email, password, {
        name: trimmedName,
        location: trimmedLocation,
      });
      if (result.requiresEmailVerification) {
        setSuccess(`Account created for ${result.email}. Check your email to confirm it, then log in.`);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not create your account right now. Please check the fields and try again. ' + message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#0f2640] mb-2">Create your account</h1>
      <p className="mb-6 text-[#6b7280]">
        Start by adding your basic details. You can add pets and sitter times after sign-up.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          <p>{success}</p>
          <p className="mt-2 text-sm">
            You can return to{' '}
            <Link href="/login" className="font-medium text-green-900 underline">
              login
            </Link>{' '}
            after confirming the email.
          </p>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              City
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              autoComplete="address-level2"
              placeholder="Oulu"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff7a2d]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff7a2d] text-white py-2 px-4 rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-[#6b7280]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#ff7a2d] hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
