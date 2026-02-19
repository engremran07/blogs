// comments/constants.ts
// All configurable defaults — zero dependencies

import type { CommentsConfig } from '../types';

export const DEFAULT_CONFIG: Required<CommentsConfig> = {
  maxContentLength: 5000,
  maxAuthorNameLength: 120,
  maxWebsiteLength: 300,
  maxReplyDepth: 5,
  autoApproveThreshold: 3,
  customSpamKeywords: [],
  maxLinksBeforeSpam: 3,
  capsSpamRatio: 0.5,
  capsCheckMinLength: 20,
  trackMetadata: true,
  enableVoting: true,
  enableReactions: true,
  enableProfanityFilter: false,
  profanityWords: [],
  enableLearningSignals: true,
  spamRetentionDays: 30,
  deletedRetentionDays: 90,

  // Admin-dynamic defaults
  commentsEnabled: true,
  requireModeration: false,
  allowGuestComments: true,
  editWindowMinutes: 30,
  closeCommentsAfterDays: 0,
  maxCommentsPerPostPerUser: 0,
  maxCommentsPerHour: 0,
  autoFlagThreshold: 3,
  spamScoreThreshold: 50,
  blockedEmails: [],
  blockedDomains: [],
  blockedIps: [],
  enableThreading: true,
  pinnedCommentLimit: 3,
  notifyOnFlag: true,
  notifyOnSpam: false,
};

export const SPAM_KEYWORDS: string[] = [
  'viagra', 'casino', 'lottery', 'click here', 'buy now',
  'limited offer', 'act now', 'free money', 'winner', 'congratulations',
  'earn money', 'work from home', 'make money fast', 'online pharmacy',
  'cheap meds', 'weight loss', 'enlargement', 'nigerian prince',
  'wire transfer', 'western union', 'bitcoin doubler',
  'crypto giveaway', 'investment opportunity', '100% free',
  'no obligation', 'risk free', 'guaranteed income',
  'click below', 'subscribe now', 'unsubscribe',
];

export const SIGNAL = {
  COMMENT_SUBMITTED: 'COMMENT_SUBMITTED',
  COMMENT_APPROVED: 'COMMENT_APPROVED',
  COMMENT_APPROVED_AUTO: 'COMMENT_APPROVED_AUTO',
  COMMENT_REJECTED: 'COMMENT_REJECTED',
  COMMENT_FLAGGED: 'COMMENT_FLAGGED',
  COMMENT_UNFLAGGED: 'COMMENT_UNFLAGGED',
  COMMENT_PINNED: 'COMMENT_PINNED',
  COMMENT_UNPINNED: 'COMMENT_UNPINNED',
  COMMENT_RESOLVED: 'COMMENT_RESOLVED',
  COMMENT_UNRESOLVED: 'COMMENT_UNRESOLVED',
  COMMENT_DELETED: 'COMMENT_DELETED',
  COMMENT_RESTORED: 'COMMENT_RESTORED',
  COMMENT_EDITED: 'COMMENT_EDITED',
  COMMENT_VOTED: 'COMMENT_VOTED',
  COMMENT_REPLIED: 'COMMENT_REPLIED',
} as const;

export { MODERATOR_ROLES } from '@/features/auth/server/capabilities';

export const MAX_BULK_IDS = 100;
