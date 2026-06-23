'use client';

import { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/lib/profileService';
import {
  deleteAbusiveReview,
  freezeAccount,
  viewReportedUsers,
  viewSuspiciousActivity,
} from '@/lib/moderationService';
import { ReportRecord } from '@/types/moderation';

export default function AdminPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [suspicious, setSuspicious] = useState<ReportRecord[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [reviewOwnerId, setReviewOwnerId] = useState('');
  const [reviewRequestId, setReviewRequestId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const profile = await getProfile(user.uid);
      const admin = profile?.role === 'admin';
      setIsAdmin(admin);

      if (!admin) {
        return;
      }

      const [reportedUsers, suspiciousActivity] = await Promise.all([
        viewReportedUsers(user.uid),
        viewSuspiciousActivity(user.uid),
      ]);
      setReports(reportedUsers);
      setSuspicious(suspiciousActivity);
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

  async function handleFreezeAccount() {
    if (!user || !targetUserId.trim()) return;

    try {
      setError('');
      await freezeAccount(user.uid, targetUserId.trim(), freezeReason.trim());
      setSuccess('Account frozen successfully.');
      setTargetUserId('');
      setFreezeReason('');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not freeze this account right now. Please try again. ' + message);
    }
  }

  async function handleDeleteReview() {
    if (!user || !reviewOwnerId.trim() || !reviewRequestId.trim()) return;

    try {
      setError('');
      await deleteAbusiveReview(user.uid, reviewOwnerId.trim(), reviewRequestId.trim());
      setSuccess('Review removed successfully.');
      setReviewOwnerId('');
      setReviewRequestId('');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('We could not remove this review right now. Please try again. ' + message);
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#0f2640] mb-6">Admin Tools</h1>

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

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#6b7280]">Loading admin tools...</p>
          </div>
        ) : !isAdmin ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-[#0f2640] font-semibold">This page is only for admins.</p>
            <p className="mt-2 text-sm text-[#6b7280]">
              If you need help, please contact support.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-[#0f2640] mb-3">Freeze Account</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Target user ID"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="Reason"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleFreezeAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Freeze
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-[#0f2640] mb-3">Delete Abusive Review</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={reviewOwnerId}
                  onChange={(e) => setReviewOwnerId(e.target.value)}
                  placeholder="Owner ID"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={reviewRequestId}
                  onChange={(e) => setReviewRequestId(e.target.value)}
                  placeholder="Request ID"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleDeleteReview}
                  className="px-4 py-2 bg-[#ff7a2d] text-white rounded-lg hover:bg-[#e66a1f] transition-colors font-medium"
                >
                  Delete Review
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-[#0f2640] mb-3">Reported Users</h2>
              {reports.length === 0 ? (
                <p className="text-[#6b7280]">No open user reports.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded p-3 text-sm">
                      <p className="text-[#0f2640] font-medium">Target user: {report.targetUserId}</p>
                      <p className="text-[#6b7280]">Reason: {report.reason}</p>
                      <p className="text-[#6b7280]">Reporter: {report.reporterId}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-[#0f2640] mb-3">Suspicious Activity</h2>
              {suspicious.length === 0 ? (
                <p className="text-[#6b7280]">No suspicious activity reports.</p>
              ) : (
                <div className="space-y-2">
                  {suspicious.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded p-3 text-sm">
                      <p className="text-[#0f2640] font-medium">Type: {report.type}</p>
                      {report.targetUserId && <p className="text-[#6b7280]">Target user: {report.targetUserId}</p>}
                      {report.targetRequestId && (
                        <p className="text-[#6b7280]">Target request: {report.targetRequestId}</p>
                      )}
                      <p className="text-[#6b7280]">Reason: {report.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
