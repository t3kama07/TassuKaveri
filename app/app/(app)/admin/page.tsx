'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/lib/profileService';
import {
  type AdminUserCreditRecord,
  adjustUserCredits,
  deleteAbusiveReview,
  setAccountFrozen,
  updateReportStatus,
  viewAdminUsers,
  viewOpenReports,
} from '@/lib/moderationService';
import { ReportRecord, ReportStatus, ReportType } from '@/types/moderation';

type ReportGroup = {
  title: string;
  description: string;
  emptyMessage: string;
  reports: ReportRecord[];
};

const USERS_PER_PAGE = 10;

function formatReportDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getTypeLabel(type: ReportType): string {
  switch (type) {
    case 'request':
      return 'Reported request';
    case 'user':
      return 'Reported user';
    case 'suspicious':
      return 'Suspicious activity';
    default:
      return type;
  }
}

function getTypeClass(type: ReportType): string {
  switch (type) {
    case 'request':
      return 'border-[#ffd7bf] bg-[#fff4ec] text-[#b94f1d]';
    case 'user':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'suspicious':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700';
  }
}

function getPrimaryTargetId(report: ReportRecord): string {
  return report.targetUserId || report.targetOwnerId || '';
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a8794]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-[#0f2640]">{value}</dd>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = 'secondary',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const className =
    variant === 'primary'
      ? 'border-[#e96b2c] bg-[#e96b2c] text-white hover:bg-[#d95f23]'
      : variant === 'danger'
        ? 'border-red-300 bg-white text-red-700 hover:bg-red-50'
        : 'border-[#d8cbbb] bg-white text-[#0f2640] hover:bg-[#fff7ef]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserCreditRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'moderation'>('users');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [targetUserId, setTargetUserId] = useState('');
  const [accountReason, setAccountReason] = useState('');
  const [creditTargetUserId, setCreditTargetUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [reviewOwnerId, setReviewOwnerId] = useState('');
  const [reviewRequestId, setReviewRequestId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actioningKey, setActioningKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const profile = await getProfile(user.uid);
      const admin = profile?.role === 'admin';
      setIsAdmin(admin);

      if (!admin) {
        setReports([]);
        setAdminUsers([]);
        return;
      }

      const [nextReports, nextAdminUsers] = await Promise.all([
        viewOpenReports(user.uid),
        viewAdminUsers(user.uid),
      ]);
      setReports(nextReports);
      setAdminUsers(nextAdminUsers);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not load admin tools right now. Please try again. ' + message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearchQuery, adminUsers.length]);

  const requestReports = useMemo(
    () => reports.filter((report) => report.type === 'request'),
    [reports]
  );
  const userReports = useMemo(
    () => reports.filter((report) => report.type === 'user'),
    [reports]
  );
  const suspiciousReports = useMemo(
    () => reports.filter((report) => report.type === 'suspicious'),
    [reports]
  );

  const reportGroups: ReportGroup[] = [
    {
      title: 'Reported Requests',
      description: 'Owners or sitters flagged unsafe, spammy, or inappropriate care requests.',
      emptyMessage: 'No open request reports.',
      reports: requestReports,
    },
    {
      title: 'Reported Users',
      description: 'Members flagged for behavior, profile content, or communication concerns.',
      emptyMessage: 'No open user reports.',
      reports: userReports,
    },
    {
      title: 'Suspicious Activity',
      description: 'Automated signals such as repeated exchange patterns that need admin review.',
      emptyMessage: 'No suspicious activity reports.',
      reports: suspiciousReports,
    },
  ];

  const filteredAdminUsers = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (!query) {
      return adminUsers;
    }

    return adminUsers.filter((adminUser) =>
      [adminUser.uid, adminUser.name, adminUser.email].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [adminUsers, userSearchQuery]);

  const userPageCount = Math.max(1, Math.ceil(filteredAdminUsers.length / USERS_PER_PAGE));
  const normalizedUserPage = Math.min(userPage, userPageCount);
  const visibleAdminUsers = filteredAdminUsers.slice(
    (normalizedUserPage - 1) * USERS_PER_PAGE,
    normalizedUserPage * USERS_PER_PAGE
  );
  const firstVisibleUserNumber =
    filteredAdminUsers.length === 0 ? 0 : (normalizedUserPage - 1) * USERS_PER_PAGE + 1;
  const lastVisibleUserNumber = Math.min(
    normalizedUserPage * USERS_PER_PAGE,
    filteredAdminUsers.length
  );

  async function runAdminAction(
    actionKey: string,
    successMessage: string,
    action: () => Promise<void>
  ) {
    if (!user) return;

    try {
      setActioningKey(actionKey);
      setError('');
      setSuccess('');
      await action();
      setSuccess(successMessage);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Admin action failed. Please try again. ' + message);
    } finally {
      setActioningKey(null);
    }
  }

  function handleReportStatus(report: ReportRecord, status: ReportStatus) {
    void runAdminAction(
      `${status}-${report.id}`,
      status === 'resolved' ? 'Report marked resolved.' : 'Report dismissed.',
      () => updateReportStatus(user?.uid || '', report.id, status)
    );
  }

  function handleFreezeReportTarget(report: ReportRecord) {
    const targetId = getPrimaryTargetId(report);
    if (!targetId) {
      setError('This report has no target user to freeze.');
      return;
    }

    void runAdminAction(`freeze-${report.id}`, 'Target account frozen.', () =>
      setAccountFrozen(user?.uid || '', targetId, true, `Action from report ${report.id}`)
    );
  }

  function handleAccountFrozenChange(frozen: boolean) {
    const trimmedTarget = targetUserId.trim();
    if (!trimmedTarget) {
      setError('Enter a target user ID first.');
      return;
    }

    void runAdminAction(
      `${frozen ? 'freeze' : 'unfreeze'}-${trimmedTarget}`,
      frozen ? 'Account frozen.' : 'Account unfrozen.',
      async () => {
        await setAccountFrozen(
          user?.uid || '',
          trimmedTarget,
          frozen,
          accountReason.trim() || 'Admin action'
        );
        setTargetUserId('');
        setAccountReason('');
      }
    );
  }

  function handleDeleteReview() {
    const ownerId = reviewOwnerId.trim();
    const requestId = reviewRequestId.trim();
    if (!ownerId || !requestId) {
      setError('Enter both owner ID and request ID.');
      return;
    }

    void runAdminAction('delete-review', 'Review removed and sitter rating recalculated.', async () => {
      await deleteAbusiveReview(user?.uid || '', ownerId, requestId);
      setReviewOwnerId('');
      setReviewRequestId('');
    });
  }

  function handleCreditAdjustment(direction: 'add' | 'deduct') {
    const trimmedTarget = creditTargetUserId.trim();
    const parsedAmount = Number(creditAmount);
    if (!trimmedTarget) {
      setError('Enter a target user ID first.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a positive credit amount.');
      return;
    }

    void runAdminAction(
      `${direction}-credits-${trimmedTarget}`,
      direction === 'add' ? 'Credits added.' : 'Credits deducted.',
      async () => {
        await adjustUserCredits(
          user?.uid || '',
          trimmedTarget,
          parsedAmount,
          direction,
          creditReason.trim() || 'Admin credit adjustment'
        );
        setCreditTargetUserId('');
        setCreditAmount('');
        setCreditReason('');
      }
    );
  }

  const actionBusy = actioningKey !== null;
  const tabButtonClass = (tab: 'users' | 'moderation') =>
    activeTab === tab
      ? 'border-[#e96b2c] bg-[#e96b2c] text-white'
      : 'border-[#d8cbbb] bg-white text-[#0f2640] hover:bg-[#fff7ef]';

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[24px] border border-[#ded3c2] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e96b2c]">
                TassuKaveri Admin
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#0f2640] sm:text-4xl">
                Moderation Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c6b7a] sm:text-base">
                Review reports, protect members, and keep pet-care exchanges safe and respectful.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading || actionBusy}
                className="rounded-full border border-[#d8cbbb] bg-[#fffdf9] px-5 py-3 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef] disabled:opacity-50"
              >
                Refresh queue
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf6] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">Open</p>
                <p className="mt-2 text-3xl font-black text-[#0f2640]">{reports.length}</p>
              </div>
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf6] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">Requests</p>
                <p className="mt-2 text-3xl font-black text-[#0f2640]">{requestReports.length}</p>
              </div>
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf6] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">Users</p>
                <p className="mt-2 text-3xl font-black text-[#0f2640]">{userReports.length}</p>
              </div>
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf6] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8794]">Signals</p>
                <p className="mt-2 text-3xl font-black text-[#0f2640]">{suspiciousReports.length}</p>
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {loading ? (
          <section className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
            <p className="text-[#6b7280]">Loading admin tools...</p>
          </section>
        ) : !isAdmin ? (
          <section className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
            <p className="font-semibold text-[#0f2640]">This page is only for admins.</p>
            <p className="mt-2 text-sm text-[#6b7280]">
              Log in with an account whose profile role is set to admin.
            </p>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap gap-3" role="tablist" aria-label="Admin sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'users'}
                onClick={() => setActiveTab('users')}
                className={`rounded-full border px-5 py-2 text-sm font-bold transition-colors ${tabButtonClass(
                  'users'
                )}`}
              >
                Users & Credits
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'moderation'}
                onClick={() => setActiveTab('moderation')}
                className={`rounded-full border px-5 py-2 text-sm font-bold transition-colors ${tabButtonClass(
                  'moderation'
                )}`}
              >
                Moderation
              </button>
            </div>

            {activeTab === 'users' ? (
              <section className="space-y-5">
                <div className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-[#0f2640]">Credit Controls</h2>
                  <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                    Add or deduct credits for a member wallet. Every change is saved as a transaction.
                  </p>
                  <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_auto_auto] lg:items-center">
                    <input
                      type="text"
                      value={creditTargetUserId}
                      onChange={(event) => setCreditTargetUserId(event.target.value)}
                      placeholder="Target user ID"
                      className="rounded-xl border border-[#d8cbbb] px-4 py-3 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf]"
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={creditAmount}
                      onChange={(event) => setCreditAmount(event.target.value)}
                      placeholder="Credits"
                      className="rounded-xl border border-[#d8cbbb] px-4 py-3 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf]"
                    />
                    <input
                      type="text"
                      value={creditReason}
                      onChange={(event) => setCreditReason(event.target.value)}
                      placeholder="Reason or internal note"
                      className="rounded-xl border border-[#d8cbbb] px-4 py-3 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf]"
                    />
                    <ActionButton
                      variant="primary"
                      disabled={actionBusy}
                      onClick={() => handleCreditAdjustment('add')}
                    >
                      Add credits
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      disabled={actionBusy}
                      onClick={() => handleCreditAdjustment('deduct')}
                    >
                      Deduct credits
                    </ActionButton>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.03em] text-[#0f2640]">
                        Users & Credits
                      </h2>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        {filteredAdminUsers.length} of {adminUsers.length} registered members
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="search"
                        value={userSearchQuery}
                        onChange={(event) => setUserSearchQuery(event.target.value)}
                        placeholder="Search users"
                        className="w-full rounded-full border border-[#d8cbbb] bg-[#fffdf9] px-4 py-2 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf] sm:w-56"
                      />
                      <button
                        type="button"
                        onClick={() => void loadData()}
                        disabled={loading || actionBusy}
                        className="rounded-full border border-[#d8cbbb] bg-[#fffdf9] px-5 py-2 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef] disabled:opacity-50"
                      >
                        Refresh users
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-[860px] w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#eadfce] text-xs uppercase tracking-[0.12em] text-[#7a8794]">
                          <th className="py-3 pr-4 font-bold">Target ID</th>
                          <th className="px-4 py-3 font-bold">Users name</th>
                          <th className="px-4 py-3 font-bold">Email address</th>
                          <th className="px-4 py-3 font-bold">Credit amount</th>
                          <th className="px-4 py-3 font-bold">Date Reg</th>
                          <th className="py-3 pl-4 font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0e7dc]">
                        {visibleAdminUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-[#6b7280]">
                              {adminUsers.length === 0
                                ? 'No registered members found.'
                                : 'No users match your search.'}
                            </td>
                          </tr>
                        ) : (
                          visibleAdminUsers.map((adminUser) => (
                            <tr key={adminUser.uid} className="align-top">
                              <td className="max-w-[220px] break-all py-4 pr-4 font-mono text-xs text-[#0f2640]">
                                {adminUser.uid}
                              </td>
                              <td className="px-4 py-4 font-semibold text-[#0f2640]">
                                {adminUser.name || 'Unnamed user'}
                              </td>
                              <td className="px-4 py-4 text-[#5c6b7a]">{adminUser.email}</td>
                              <td className="px-4 py-4 font-black text-[#0f2640]">
                                {adminUser.creditAmount}
                              </td>
                              <td className="px-4 py-4 text-[#5c6b7a]">
                                {formatReportDate(adminUser.createdAt)}
                              </td>
                              <td className="py-4 pl-4">
                                <ActionButton
                                  disabled={actionBusy}
                                  onClick={() => setCreditTargetUserId(adminUser.uid)}
                                >
                                  Use ID
                                </ActionButton>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-[#eadfce] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-[#5c6b7a]">
                      Showing {firstVisibleUserNumber}-{lastVisibleUserNumber} of{' '}
                      {filteredAdminUsers.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUserPage((currentPage) => Math.max(1, currentPage - 1))}
                        disabled={normalizedUserPage === 1}
                        className="rounded-full border border-[#d8cbbb] bg-white px-4 py-2 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="min-w-20 text-center text-sm font-bold text-[#0f2640]">
                        Page {normalizedUserPage} of {userPageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUserPage((currentPage) => Math.min(userPageCount, currentPage + 1))
                        }
                        disabled={normalizedUserPage === userPageCount}
                        className="rounded-full border border-[#d8cbbb] bg-white px-4 py-2 text-sm font-bold text-[#0f2640] transition-colors hover:bg-[#fff7ef] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-[#0f2640]">Account Controls</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                      Freeze unsafe accounts quickly. Unfreeze accounts after review or appeal.
                    </p>
                    <div className="mt-5 grid gap-3">
                      <input
                        type="text"
                        value={targetUserId}
                        onChange={(event) => setTargetUserId(event.target.value)}
                        placeholder="Target user ID"
                        className="rounded-xl border border-[#d8cbbb] px-4 py-3 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf]"
                      />
                      <input
                        type="text"
                        value={accountReason}
                        onChange={(event) => setAccountReason(event.target.value)}
                        placeholder="Reason or internal note"
                        className="rounded-xl border border-[#d8cbbb] px-4 py-3 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf]"
                      />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <ActionButton
                          variant="danger"
                          disabled={actionBusy}
                          onClick={() => handleAccountFrozenChange(true)}
                        >
                          Freeze account
                        </ActionButton>
                        <ActionButton
                          disabled={actionBusy}
                          onClick={() => handleAccountFrozenChange(false)}
                        >
                          Unfreeze account
                        </ActionButton>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#ded3c2] bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-[#0f2640]">Review Controls</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                      Remove abusive reviews and recalculate sitter rating/trust values.
                    </p>
                    <div className="mt-5 grid gap-3">
                      <input
                        type="text"
                        value={reviewOwnerId}
                        onChange={(event) => setReviewOwnerId(event.target.value)}
                        placeholder="Request owner ID"
                        className="rounded-xl border border-[#d8cbbb] px-4 py-3 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf]"
                      />
                      <input
                        type="text"
                        value={reviewRequestId}
                        onChange={(event) => setReviewRequestId(event.target.value)}
                        placeholder="Request ID"
                        className="rounded-xl border border-[#d8cbbb] px-4 py-3 text-sm outline-none focus:border-[#e96b2c] focus:ring-2 focus:ring-[#ffd7bf]"
                      />
                      <div>
                        <ActionButton
                          variant="primary"
                          disabled={actionBusy}
                          onClick={handleDeleteReview}
                        >
                          Delete abusive review
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-[-0.03em] text-[#0f2640]">
                    Moderation Queue
                  </h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Resolve when action was taken. Dismiss when the report is not actionable.
                  </p>
                </div>

                {reportGroups.map((group) => (
                  <div key={group.title} className="space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-[#0f2640]">{group.title}</h3>
                        <p className="text-sm text-[#6b7280]">{group.description}</p>
                      </div>
                      <span className="rounded-full bg-[#fff1e6] px-3 py-1 text-xs font-bold text-[#e96b2c]">
                        {group.reports.length} open
                      </span>
                    </div>

                    {group.reports.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d8cbbb] bg-[#fffdf9] p-5 text-sm text-[#6b7280]">
                        {group.emptyMessage}
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {group.reports.map((report) => {
                          const targetId = getPrimaryTargetId(report);

                          return (
                            <article
                              key={report.id}
                              className="rounded-[22px] border border-[#ded3c2] bg-white p-5 shadow-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-bold ${getTypeClass(
                                    report.type
                                  )}`}
                                >
                                  {getTypeLabel(report.type)}
                                </span>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                  {report.status}
                                </span>
                              </div>

                              <p className="mt-4 text-sm font-semibold leading-6 text-[#0f2640]">
                                {report.reason}
                              </p>

                              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                                <DetailRow label="Reporter" value={report.reporterId} />
                                <DetailRow label="Target user" value={report.targetUserId} />
                                <DetailRow label="Target owner" value={report.targetOwnerId} />
                                <DetailRow label="Target request" value={report.targetRequestId} />
                                <DetailRow label="Report ID" value={report.id} />
                                <DetailRow label="Created" value={formatReportDate(report.createdAt)} />
                              </dl>

                              <div className="mt-5 flex flex-wrap gap-2">
                                <ActionButton
                                  variant="primary"
                                  disabled={actionBusy}
                                  onClick={() => handleReportStatus(report, 'resolved')}
                                >
                                  Resolve
                                </ActionButton>
                                <ActionButton
                                  disabled={actionBusy}
                                  onClick={() => handleReportStatus(report, 'dismissed')}
                                >
                                  Dismiss
                                </ActionButton>
                                {targetId && (
                                  <ActionButton
                                    variant="danger"
                                    disabled={actionBusy}
                                    onClick={() => handleFreezeReportTarget(report)}
                                  >
                                    Freeze target
                                  </ActionButton>
                                )}
                                {report.targetOwnerId && report.targetRequestId && (
                                  <ActionButton
                                    disabled={actionBusy}
                                    onClick={() => {
                                      setReviewOwnerId(report.targetOwnerId || '');
                                      setReviewRequestId(report.targetRequestId || '');
                                    }}
                                  >
                                    Fill review tool
                                  </ActionButton>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
