'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { DEMO_USER_PASSWORD, getDetailedDemoUsers } from '@/lib/demoUserPresets';
import { createTestUsers, seedDetailedDemoUsers, TestUserSeedResult } from '@/lib/testUserService';

function summarizeResults(results: TestUserSeedResult[]): string {
  const createdCount = results.filter((entry) => entry.status === 'created').length;
  const updatedCount = results.filter((entry) => entry.status === 'updated').length;
  const failedCount = results.filter((entry) => entry.status === 'failed').length;

  const parts: string[] = [];
  if (createdCount > 0) {
    parts.push(`${createdCount} created`);
  }
  if (updatedCount > 0) {
    parts.push(`${updatedCount} updated`);
  }
  if (failedCount > 0) {
    parts.push(`${failedCount} failed`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No changes made';
}

export default function TestUsersPage() {
  const [enabled, setEnabled] = useState(false);
  const [prefix, setPrefix] = useState('user');
  const [domain, setDomain] = useState('gmail.com');
  const [count, setCount] = useState(5);
  const [startAt, setStartAt] = useState(1);
  const [password, setPassword] = useState(DEMO_USER_PASSWORD);
  const [location, setLocation] = useState('Helsinki');
  const [country, setCountry] = useState('Finland');
  const [creatingMode, setCreatingMode] = useState<'basic' | 'demo' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState<TestUserSeedResult[]>([]);
  const demoUsers = getDetailedDemoUsers();
  const isCreating = creatingMode !== null;

  useEffect(() => {
    const hostname = window.location.hostname;
    setEnabled(hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local'));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setResults([]);

    if (!prefix.trim()) {
      setError('Email prefix is required.');
      return;
    }

    if (!domain.trim()) {
      setError('Email domain is required.');
      return;
    }

    if (!location.trim()) {
      setError('Location is required.');
      return;
    }

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setCreatingMode('basic');

    try {
      const createdUsers = await createTestUsers({
        prefix,
        domain,
        count,
        startAt,
        password,
        location,
        country,
      });

      setResults(createdUsers);
      setSuccess(`Custom test user run completed: ${summarizeResults(createdUsers)}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to create test users: ' + message);
    } finally {
      setCreatingMode(null);
    }
  }

  async function handleSeedDetailedDemoUsers() {
    setError('');
    setSuccess('');
    setResults([]);
    setCreatingMode('demo');

    try {
      const seededUsers = await seedDetailedDemoUsers();
      setResults(seededUsers);
      setSuccess(`Detailed demo pack finished: ${summarizeResults(seededUsers)}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to seed detailed demo users: ' + message);
    } finally {
      setCreatingMode(null);
    }
  }

  if (!enabled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-[#0f2640] mb-4">Test User Creator</h1>
          <p className="text-[#6b7280]">
            This tool is only available on localhost for development.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0f2640]">Test User Creator</h1>
            <p className="text-[#6b7280] mt-2">
              Create multiple Firebase test accounts with matching profiles and starter wallets.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 rounded-lg text-[#0f2640] hover:bg-gray-50 transition-colors font-medium"
          >
            Back Home
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0f2640]">Detailed Demo Pack</h2>
              <p className="mt-1 text-sm text-[#355070]">
                One click creates or updates six realistic demo accounts with profile details, pets, wallets, and sitter availability slots.
              </p>
              <p className="mt-2 text-sm text-[#355070]">
                Shared password: <span className="font-semibold">{DEMO_USER_PASSWORD}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#355070]">
                {demoUsers.map((user) => (
                  <span
                    key={user.email}
                    className="rounded-full border border-blue-200 bg-white px-3 py-1"
                  >
                    {user.email}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSeedDetailedDemoUsers}
              disabled={isCreating}
              className="px-5 py-2 bg-[#0f2640] text-white rounded-lg hover:bg-[#183552] transition-colors font-medium disabled:opacity-50"
            >
              {creatingMode === 'demo' ? 'Seeding Demo Pack...' : 'Seed 6 Demo Users'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Email Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="user"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Email Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              How Many
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(event) => setCount(Number(event.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Start Number
            </label>
            <input
              type="number"
              min={1}
              value={startAt}
              onChange={(event) => setStartAt(Number(event.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Shared Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Default Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Helsinki"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Finland"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium disabled:opacity-50"
            >
              {creatingMode === 'basic' ? 'Creating Test Users...' : 'Create Test Users'}
            </button>
            <p className="text-sm text-[#6b7280]">
              Example output: {prefix || 'user'}
              {startAt}@{domain || 'gmail.com'}
            </p>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-[#0f2640] mb-3">Results</h2>
        {results.length === 0 ? (
          <p className="text-[#6b7280]">No users created yet.</p>
        ) : (
          <div className="space-y-3">
            {results.map((entry) => (
              <div
                key={entry.email}
                className={`rounded-lg border p-4 ${
                  entry.status === 'failed'
                    ? 'border-red-200 bg-red-50'
                    : entry.status === 'updated'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[#0f2640]">{entry.email}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      entry.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : entry.status === 'updated'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {entry.status === 'created'
                      ? 'Created'
                      : entry.status === 'updated'
                        ? 'Updated'
                        : 'Failed'}
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] mt-1">Password: {entry.password}</p>
                {entry.uid && <p className="text-sm text-[#6b7280]">UID: {entry.uid}</p>}
                <p
                  className={`text-sm mt-1 ${
                    entry.status === 'created'
                      ? 'text-green-700'
                      : entry.status === 'updated'
                        ? 'text-blue-700'
                        : 'text-red-700'
                  }`}
                >
                  {entry.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
