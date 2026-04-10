import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken, verifySessionToken } from '@/lib/serverAuth';
import {
  MAX_PROFILE_IMAGE_BYTES,
  uploadProfileImageToSupabase,
} from '@/lib/supabaseProfileImageStore';

export async function POST(request: NextRequest) {
  try {
    const idToken = readBearerToken(request.headers);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(idToken);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const formData = await request.formData();
    const userId = formData.get('userId');
    const file = formData.get('file');

    if (typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (sessionUser.uid !== userId) {
      return NextResponse.json({ error: 'Actor mismatch for profile image upload' }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Please choose an image file.' }, { status: 400 });
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 400 });
    }

    const fileData = await file.arrayBuffer();
    const uploaded = await uploadProfileImageToSupabase({
      userId,
      fileName: file.name || 'profile-image',
      contentType: file.type || 'application/octet-stream',
      fileData,
    });

    return NextResponse.json({
      ok: true,
      publicUrl: uploaded.publicUrl,
      path: uploaded.path,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected profile image sync failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

