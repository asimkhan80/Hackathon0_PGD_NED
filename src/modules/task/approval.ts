import type { Task } from '../../types/task.js';

/**
 * Article IV approval criteria
 * Tasks matching these criteria MUST be approved by a human
 */
export interface ApprovalCriteria {
  /** Involves financial transactions */
  financial: boolean;
  /** Involves communication to new recipients */
  newRecipient: boolean;
  /** Involves legal or emotional communication */
  legalOrEmotional: boolean;
  /** Involves social media posting */
  socialMedia: boolean;
  /** Involves external deletions */
  externalDeletion: boolean;
}

/**
 * Keywords that indicate financial activity
 */
const FINANCIAL_KEYWORDS = [
  'payment', 'pay', 'transfer', 'invoice', 'money', 'amount',
  'charge', 'refund', 'reimburse', 'bill', 'fee', 'cost',
  'purchase', 'buy', 'sell', 'transaction', 'account',
  '$', '€', '£', 'usd', 'eur', 'gbp',
];

/**
 * Keywords that indicate communication
 */
const COMMUNICATION_KEYWORDS = [
  'email', 'send', 'reply', 'message', 'contact', 'reach out',
  'respond', 'write to', 'notify', 'inform', 'tell',
];

/**
 * Keywords that indicate legal/emotional content
 */
const LEGAL_EMOTIONAL_KEYWORDS = [
  'legal', 'contract', 'agreement', 'sign', 'commit',
  'sorry', 'apologize', 'apology', 'condolence', 'sympathy',
  'complaint', 'grievance', 'dispute', 'lawsuit', 'attorney',
  'confidential', 'sensitive', 'private',
];

/**
 * Keywords that indicate social media
 */
const SOCIAL_MEDIA_KEYWORDS = [
  'post', 'tweet', 'publish', 'share', 'social media',
  'facebook', 'twitter', 'linkedin', 'instagram', 'tiktok',
  'youtube', 'blog', 'announcement',
];

/**
 * Keywords that indicate deletion
 */
const DELETION_KEYWORDS = [
  'delete', 'remove', 'cancel', 'terminate', 'close account',
  'unsubscribe', 'revoke', 'destroy', 'erase',
];

/**
 * Check if content contains any keywords from a list
 */
function containsKeywords(content: string, keywords: string[]): boolean {
  const lowerContent = content.toLowerCase();
  return keywords.some((keyword) => lowerContent.includes(keyword.toLowerCase()));
}

/**
 * Analyze task for approval criteria
 * @param task - Task to analyze
 * @returns Approval criteria breakdown
 */
export function analyzeApprovalCriteria(task: Task): ApprovalCriteria {
  const content = `${task.title} ${task.raw_content}`;

  return {
    financial: containsKeywords(content, FINANCIAL_KEYWORDS),
    newRecipient: containsKeywords(content, COMMUNICATION_KEYWORDS),
    legalOrEmotional: containsKeywords(content, LEGAL_EMOTIONAL_KEYWORDS),
    socialMedia: containsKeywords(content, SOCIAL_MEDIA_KEYWORDS),
    externalDeletion: containsKeywords(content, DELETION_KEYWORDS),
  };
}

/**
 * Check if task requires approval based on Article IV criteria
 * @param task - Task to evaluate
 * @returns true if approval required
 */
export function requiresApproval(task: Task): boolean {
  // If explicitly set, use that value
  if (task.requires_approval !== undefined) {
    return task.requires_approval;
  }

  const criteria = analyzeApprovalCriteria(task);

  // Approval required if any criterion is met
  return (
    criteria.financial ||
    criteria.newRecipient ||
    criteria.legalOrEmotional ||
    criteria.socialMedia ||
    criteria.externalDeletion
  );
}

/**
 * Get human-readable explanation of why approval is required
 * @param task - Task to explain
 * @returns Array of reasons
 */
export function getApprovalReasons(task: Task): string[] {
  const criteria = analyzeApprovalCriteria(task);
  const reasons: string[] = [];

  if (criteria.financial) {
    reasons.push('Involves financial transactions');
  }
  if (criteria.newRecipient) {
    reasons.push('Involves communication to recipients');
  }
  if (criteria.legalOrEmotional) {
    reasons.push('Contains legal or emotionally sensitive content');
  }
  if (criteria.socialMedia) {
    reasons.push('Involves social media posting');
  }
  if (criteria.externalDeletion) {
    reasons.push('Involves external data deletion');
  }

  return reasons;
}

/**
 * Determine approval level based on source and content
 * @param task - Task to evaluate
 * @returns 'auto' | 'manual' | 'elevated'
 */
export function getApprovalLevel(task: Task): 'auto' | 'manual' | 'elevated' {
  const criteria = analyzeApprovalCriteria(task);

  // Elevated approval for financial or legal matters
  if (criteria.financial || criteria.legalOrEmotional) {
    return 'elevated';
  }

  // Manual approval for communication or deletion
  if (criteria.newRecipient || criteria.externalDeletion || criteria.socialMedia) {
    return 'manual';
  }

  // Auto-approve for safe tasks
  return 'auto';
}
