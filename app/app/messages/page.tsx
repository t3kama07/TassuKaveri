'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-[#0f2640] mb-6">Messages</h1>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-[#6b7280]">Your conversations. Coming soon...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
