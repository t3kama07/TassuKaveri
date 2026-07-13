'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUserNotifications, markNotificationRead } from '@/lib/notificationService';
import { AppNotification } from '@/types/notification';

type NotificationIntent = {
  badge: string;
  badgeClassName: string;
  ctaLabel: string;
  href: string | null;
};

function getNotificationIntent(notification: AppNotification): NotificationIntent {
  switch (notification.type) {
    case 'direct_request_received':
      return {
        badge: 'Direct request',
        badgeClassName: 'bg-[#fff1e6] text-[#ff7a2d]',
        ctaLabel: 'Open direct requests',
        href: '/exchange?tab=direct-requests',
      };
    case 'application_received':
      return {
        badge: 'Offer',
        badgeClassName: 'bg-blue-50 text-blue-700',
        ctaLabel: 'Open my requests',
        href: '/exchange?tab=my-requests',
      };
    case 'application_accepted':
      return {
        badge: 'Accepted',
        badgeClassName: 'bg-emerald-50 text-emerald-700',
        ctaLabel: 'Open care I give',
        href: '/exchange?tab=my-sits',
      };
    case 'message_received':
      return {
        badge: 'Message',
        badgeClassName: 'bg-sky-50 text-sky-700',
        ctaLabel: 'Open messages',
        href: '/messages',
      };
    case 'review_received':
      return {
        badge: 'Review',
        badgeClassName: 'bg-violet-50 text-violet-700',
        ctaLabel: 'Open profile',
        href: '/profile',
      };
    case 'request_completed':
      return {
        badge: 'Completion',
        badgeClassName: 'bg-amber-50 text-amber-700',
        ctaLabel: 'Open requests',
        href: '/exchange',
      };
    default:
      return {
        badge: 'Update',
        badgeClassName: 'bg-gray-100 text-gray-700',
        ctaLabel: 'Open',
        href: null,
      };
  }
}

function NotificationCard({
  notification,
  onMarkRead,
  onOpen,
}: {
  notification: AppNotification;
  onMarkRead: (notificationId: string) => Promise<void>;
  onOpen: (notification: AppNotification) => Promise<void>;
}) {
  const intent = getNotificationIntent(notification);
  const { language, t } = useLanguage();
  const intentFi: Record<string, string> = {
    'Direct request': 'Suora pyyntö', 'Open direct requests': 'Avaa suorat pyynnöt',
    Offer: 'Tarjous', 'Open my requests': 'Avaa omat pyynnöt', Accepted: 'Hyväksytty',
    'Open care I give': 'Avaa antamani hoito', Message: 'Viesti', 'Open messages': 'Avaa viestit',
    Review: 'Arvostelu', 'Open profile': 'Avaa profiili', Completion: 'Valmistuminen',
    'Open requests': 'Avaa pyynnöt', Update: 'Päivitys', Open: 'Avaa',
  };

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-[0_8px_24px_rgba(15,38,64,0.06)] transition-shadow hover:shadow-[0_12px_28px_rgba(15,38,64,0.08)] ${
        notification.read ? 'border-[#e6edf5]' : 'border-[#ffcfb0]'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${intent.badgeClassName}`}>
              {language === 'fi' ? intentFi[intent.badge] || intent.badge : intent.badge}
            </span>
            {!notification.read && (
              <span className="inline-flex rounded-full bg-[#0f2640] px-2.5 py-1 text-xs font-semibold text-white">
                {t('New', 'Uusi')}
              </span>
            )}
          </div>
          <p className="mt-3 text-base font-medium leading-7 text-[#0f2640]">{notification.message}</p>
          <p className="mt-2 text-sm text-[#6b7280]">{notification.createdAt.toLocaleString(language === 'fi' ? 'fi-FI' : 'en-US')}</p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {intent.href && (
            <button
              type="button"
              onClick={() => void onOpen(notification)}
              className="rounded-full bg-[#ff7a2d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e66a1f]"
            >
              {language === 'fi' ? intentFi[intent.ctaLabel] || intent.ctaLabel : intent.ctaLabel}
            </button>
          )}
          {!notification.read && (
            <button
              type="button"
              onClick={() => void onMarkRead(notification.id)}
              className="rounded-full border border-[#d7e1eb] px-4 py-2 text-sm font-semibold text-[#0f2640] transition-colors hover:bg-[#f7fafc]"
            >
              {t('Mark as read', 'Merkitse luetuksi')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const userNotifications = await getUserNotifications(user.uid);
      setNotifications(userNotifications);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not load your updates right now. Please try again. ', 'Päivityksiä ei voitu ladata juuri nyt. Yritä uudelleen. ') + message);
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(notificationId: string) {
    try {
      await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Unknown error', 'Tuntematon virhe');
      setError(t('We could not update this item right now. Please try again. ', 'Tätä kohdetta ei voitu päivittää juuri nyt. Yritä uudelleen. ') + message);
    }
  }

  async function handleOpen(notification: AppNotification) {
    const intent = getNotificationIntent(notification);
    if (!intent.href) {
      return;
    }

    if (!notification.read) {
      await handleMarkRead(notification.id);
    }

    router.push(intent.href);
  }

  const directRequestNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 'direct_request_received'),
    [notifications]
  );

  const activityNotifications = useMemo(
    () => notifications.filter((notification) => notification.type !== 'direct_request_received'),
    [notifications]
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-[28px] border border-[#dbe5f0] bg-[linear-gradient(135deg,#fff8f1_0%,#ffffff_40%,#eef5ff_100%)] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#ff7a2d]">{t('Updates', 'Päivitykset')}</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#0f2640] sm:text-4xl">{t('See what needs your attention', 'Katso, mikä tarvitsee huomiotasi')}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#516173]">
                {t('Updates about requests, messages, and reviews appear here.', 'Hoitopyyntöihin, viesteihin ja arvosteluihin liittyvät päivitykset näkyvät täällä.')}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_10px_26px_rgba(15,38,64,0.08)]">
              <p className="text-sm text-[#6b7280]">{t('Unread updates', 'Lukemattomat päivitykset')}</p>
              <p className="mt-1 text-3xl font-bold text-[#0f2640]">{unreadCount}</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-[#e6edf5] bg-white p-6 shadow-[0_10px_24px_rgba(15,38,64,0.05)]">
            <p className="text-[#6b7280]">{t('Loading updates...', 'Ladataan päivityksiä...')}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[#e6edf5] bg-white p-8 text-center shadow-[0_10px_24px_rgba(15,38,64,0.05)]">
            <h2 className="text-xl font-semibold text-[#0f2640]">{t('No notifications yet', 'Ei vielä ilmoituksia')}</h2>
            <p className="mt-2 text-[#6b7280]">{t('Updates about requests, messages, and reviews will appear here.', 'Hoitopyyntöihin, viesteihin ja arvosteluihin liittyvät päivitykset tulevat näkyviin täällä.')}</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section className="rounded-[28px] border border-[#ffd7be] bg-[#fffaf6] p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2640]">{t('Direct asks', 'Suorat pyynnöt')}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    {t('Pet owners sent these requests only to you.', 'Lemmikinomistajat ovat lähettäneet nämä pyynnöt vain sinulle.')}
                  </p>
                </div>
                <span className="inline-flex self-start rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#ff7a2d] shadow-sm">
                  {language === 'fi' ? `${directRequestNotifications.length} päivitystä` : `${directRequestNotifications.length} update${directRequestNotifications.length === 1 ? '' : 's'}`}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {directRequestNotifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#ffd7be] bg-white/80 p-5 text-sm text-[#6b7280]">
                    {t('No direct asks right now.', 'Ei suoria pyyntöjä juuri nyt.')}
                  </div>
                ) : (
                  directRequestNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      onOpen={handleOpen}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[#dbe5f0] bg-white p-5 shadow-[0_10px_24px_rgba(15,38,64,0.05)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2640]">{t('Other Activity', 'Muu toiminta')}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    {t('Offers, finished care, reviews, and messages.', 'Tarjoukset, päättyneet hoidot, arvostelut ja viestit.')}
                  </p>
                </div>
                <span className="inline-flex self-start rounded-full bg-[#f4f7fb] px-3 py-1 text-sm font-semibold text-[#0f2640]">
                  {language === 'fi' ? `${activityNotifications.length} päivitystä` : `${activityNotifications.length} update${activityNotifications.length === 1 ? '' : 's'}`}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {activityNotifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#dbe5f0] bg-[#f8fbfd] p-5 text-sm text-[#6b7280]">
                    {t('No other activity updates right now.', 'Ei muita päivityksiä juuri nyt.')}
                  </div>
                ) : (
                  activityNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      onOpen={handleOpen}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
