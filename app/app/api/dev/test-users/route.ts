import { NextRequest, NextResponse } from 'next/server';
import {
  createTestUsers,
  seedDetailedDemoUsers,
  type TestUserSeedOptions,
} from '@/lib/testUserService';

type TestUsersPayload =
  | {
      mode: 'basic';
      options?: Partial<TestUserSeedOptions>;
    }
  | {
      mode: 'demo';
    };

function isLocalHost(host: string | null): boolean {
  if (!host) {
    return false;
  }

  const normalizedHost = host.split(':')[0].toLowerCase();
  return (
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost.endsWith('.local')
  );
}

function isTestUsersPayload(value: unknown): value is TestUsersPayload {
  return Boolean(value && typeof value === 'object' && 'mode' in value);
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!isLocalHost(request.headers.get('host'))) {
      return NextResponse.json({ error: 'This endpoint is only available on localhost.' }, { status: 403 });
    }

    const payload = await request.json();
    if (!isTestUsersPayload(payload)) {
      return NextResponse.json({ error: 'Invalid test user payload' }, { status: 400 });
    }

    if (payload.mode === 'demo') {
      const results = await seedDetailedDemoUsers();
      return NextResponse.json({ results });
    }

    const options = payload.options;
    if (
      !options ||
      typeof options.prefix !== 'string' ||
      typeof options.domain !== 'string' ||
      typeof options.count !== 'number' ||
      typeof options.startAt !== 'number' ||
      typeof options.password !== 'string' ||
      typeof options.location !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid basic test user options' }, { status: 400 });
    }

    const results = await createTestUsers({
      prefix: options.prefix,
      domain: options.domain,
      count: options.count,
      startAt: options.startAt,
      password: options.password,
      location: options.location,
      country: typeof options.country === 'string' ? options.country : undefined,
    });

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected test user failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

