import 'server-only';

import { createSupabaseAdminClient } from './supabaseAdmin';

export type EmailSubscriptionInput = {
  id: string;
  email: string;
  source: 'website_popup';
  submittedAt: Date;
};

export async function upsertEmailSubscriptionInSupabase(
  subscription: EmailSubscriptionInput
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('email_subscriptions')
    .upsert(
      {
        id: subscription.id,
        email: subscription.email.toLowerCase(),
        source: subscription.source,
        submitted_at: subscription.submittedAt.toISOString(),
        updated_at: subscription.submittedAt.toISOString(),
      },
      { onConflict: 'email,source' }
    );

  if (error) {
    throw new Error(`Failed to save email subscription: ${error.message}`);
  }
}
