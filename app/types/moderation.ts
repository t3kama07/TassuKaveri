export type ReportType = 'user' | 'request' | 'suspicious';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface ReportRecord {
  id: string;
  reporterId: string;
  type: ReportType;
  targetUserId?: string;
  targetOwnerId?: string;
  targetRequestId?: string;
  reason: string;
  status: ReportStatus;
  createdAt: Date;
}

export interface AdminActionLogRecord {
  id: string;
  adminId: string;
  targetUserId: string;
  action: 'freeze-account' | 'unfreeze-account';
  reason: string;
  createdAt: Date;
}
