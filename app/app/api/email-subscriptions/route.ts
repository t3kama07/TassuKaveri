import { NextRequest, NextResponse } from 'next/server';
import { upsertEmailSubscriptionInSupabase } from '@/lib/emailSubscriptionStore';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { email?: unknown };
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    await upsertEmailSubscriptionInSupabase({
      id: crypto.randomUUID(),
      email,
      source: 'website_popup',
      submittedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected subscription failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
