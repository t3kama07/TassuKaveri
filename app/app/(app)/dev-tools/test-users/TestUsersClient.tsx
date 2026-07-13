'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEMO_USER_PASSWORD, getDetailedDemoUsers } from '@/lib/demoUserPresets';

type TestUserSeedResult = {
  email: string;
  password: string;
  name: string;
  uid?: string;
  status: 'created' | 'updated' | 'failed';
  message: string;
};

function summarizeResults(results: TestUserSeedResult[], language: 'en' | 'fi'): string {
  const createdCount = results.filter((entry) => entry.status === 'created').length;
  const updatedCount = results.filter((entry) => entry.status === 'updated').length;
  const failedCount = results.filter((entry) => entry.status === 'failed').length;

  const parts: string[] = [];
  if (createdCount > 0) {
    parts.push(language === 'fi' ? `${createdCount} luotu` : `${createdCount} created`);
  }
  if (updatedCount > 0) {
    parts.push(language === 'fi' ? `${updatedCount} päivitetty` : `${updatedCount} updated`);
  }
  if (failedCount > 0) {
    parts.push(language === 'fi' ? `${failedCount} epäonnistui` : `${failedCount} failed`);
  }

  return parts.length > 0 ? parts.join(', ') : language === 'fi' ? 'Ei muutoksia' : 'No changes made';
}

export default function TestUsersClient() {
  const { t } = useLanguage();
  const [prefix, setPrefix] = useState('user');
  const [domain, setDomain] = useState('example.com');
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

  async function runTestUserAction(payload: Record<string, unknown>): Promise<TestUserSeedResult[]> {
    const response = await fetch('/api/dev/test-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(responseText || t('Failed to run test user action', 'Testikäyttäjätoiminto epäonnistui'));
    }

    const parsed = responseText ? (JSON.parse(responseText) as { results?: TestUserSeedResult[] }) : {};
    return Array.isArray(parsed.results) ? parsed.results : [];
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setResults([]);

    if (!prefix.trim()) {
      setError(t('Email prefix is required.', 'Sähköpostin alkuosa on pakollinen.'));
      return;
    }

    if (!domain.trim()) {
      setError(t('Email domain is required.', 'Sähköpostin verkkotunnus on pakollinen.'));
      return;
    }

    if (!location.trim()) {
      setError(t('Location is required.', 'Sijainti on pakollinen.'));
      return;
    }

    if (password.trim().length < 6) {
      setError(t('Password must be at least 6 characters.', 'Salasanassa on oltava vähintään kuusi merkkiä.'));
      return;
    }

    setCreatingMode('basic');

    try {
      const createdUsers = await runTestUserAction({
        mode: 'basic',
        options: {
          prefix,
          domain,
          count,
          startAt,
          password,
          location,
          country,
        },
      });

      setResults(createdUsers);
      setSuccess(t(
        `Custom test user run completed: ${summarizeResults(createdUsers, 'en')}.`,
        `Mukautettujen testikäyttäjien luonti valmistui: ${summarizeResults(createdUsers, 'fi')}.`
      ));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('Failed to create test users: ', 'Testikäyttäjien luominen epäonnistui: ') + message);
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
      const seededUsers = await runTestUserAction({
        mode: 'demo',
      });
      setResults(seededUsers);
      setSuccess(t(
        `Detailed demo pack finished: ${summarizeResults(seededUsers, 'en')}.`,
        `Yksityiskohtaisen demopaketin luonti valmistui: ${summarizeResults(seededUsers, 'fi')}.`
      ));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(t('Failed to seed detailed demo users: ', 'Yksityiskohtaisten demokäyttäjien luominen epäonnistui: ') + message);
    } finally {
      setCreatingMode(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0f2640]">{t('Test User Creator', 'Testikäyttäjien luonti')}</h1>
            <p className="text-[#6b7280] mt-2">
              {t('Create multiple Supabase test accounts with matching profiles and starter wallets.', 'Luo useita Supabase-testitilejä profiileineen ja aloituskrediitteineen.')}
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 rounded-lg text-[#0f2640] hover:bg-gray-50 transition-colors font-medium"
          >
            {t('Back Home', 'Takaisin etusivulle')}
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
              <h2 className="text-lg font-bold text-[#0f2640]">{t('Detailed Demo Pack', 'Yksityiskohtainen demopaketti')}</h2>
              <p className="mt-1 text-sm text-[#355070]">
                {t('One click creates or updates six realistic demo accounts with profile details, pets, wallets, and sitter availability slots.', 'Yksi napsautus luo tai päivittää kuusi realistista demotiliä profiilitietoineen, lemmikkeineen, krediitteineen ja hoitajien vapaa-aikoineen.')}
              </p>
              <p className="mt-2 text-sm text-[#355070]">
                {t('Shared password:', 'Yhteinen salasana:')} <span className="font-semibold">{DEMO_USER_PASSWORD}</span>
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
              {creatingMode === 'demo' ? t('Seeding Demo Pack...', 'Luodaan demopakettia...') : t('Seed 6 Demo Users', 'Luo 6 demokäyttäjää')}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              {t('Email Prefix', 'Sähköpostin alkuosa')}
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
              {t('Email Domain', 'Sähköpostin verkkotunnus')}
            </label>
            <input
              type="text"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f2640] mb-1">
              {t('How Many', 'Käyttäjien määrä')}
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
              {t('Start Number', 'Aloitusnumero')}
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
              {t('Shared Password', 'Yhteinen salasana')}
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
              {t('Default Location', 'Oletussijainti')}
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
              {t('Country', 'Maa')}
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
              {creatingMode === 'basic' ? t('Creating Test Users...', 'Luodaan testikäyttäjiä...') : t('Create Test Users', 'Luo testikäyttäjiä')}
            </button>
            <p className="text-sm text-[#6b7280]">
              {t('Example output:', 'Esimerkkitulos:')} {prefix || 'user'}
              {startAt}@{domain || 'example.com'}
            </p>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-[#0f2640] mb-3">{t('Results', 'Tulokset')}</h2>
        {results.length === 0 ? (
          <p className="text-[#6b7280]">{t('No users created yet.', 'Käyttäjiä ei ole vielä luotu.')}</p>
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
                      ? t('Created', 'Luotu')
                      : entry.status === 'updated'
                        ? t('Updated', 'Päivitetty')
                        : t('Failed', 'Epäonnistui')}
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] mt-1">{t('Password:', 'Salasana:')} {entry.password}</p>
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
