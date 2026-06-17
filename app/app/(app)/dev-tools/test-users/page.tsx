import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import TestUsersClient from './TestUsersClient';

function isLocalHost(host: string | null): boolean {
  const normalizedHost = (host ?? '').split(':')[0].toLowerCase();

  return (
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost.endsWith('.local')
  );
}

export default async function TestUsersPage() {
  const requestHeaders = await headers();

  if (!isLocalHost(requestHeaders.get('host'))) {
    notFound();
  }

  return <TestUsersClient />;
}
