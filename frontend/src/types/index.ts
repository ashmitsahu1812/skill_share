/**
 * TypeScript type definitions for the SkillShare platform
 */

export type SkillCategory =
  | 'Programming & Tech'
  | 'Design & Creative Arts'
  | 'Music & Audio Production'
  | 'Cooking & Culinary'
  | 'Fitness & Wellness'
  | 'Languages & Communication'
  | 'Finance & Business'
  | 'Photography & Videography'
  | 'Other';

export const SKILL_CATEGORIES: SkillCategory[] = [
  'Programming & Tech',
  'Design & Creative Arts',
  'Music & Audio Production',
  'Cooking & Culinary',
  'Fitness & Wellness',
  'Languages & Communication',
  'Finance & Business',
  'Photography & Videography',
  'Other',
];

export interface User {
  _id: string;
  firebaseUid: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  bio: string;
  skillsToTeach: string[];
  skillsToLearn: string[];
  categories: SkillCategory[];
  followers: string[];
  following: string[];
  isCreator: boolean;
  isVerified: boolean;
  sessionRate: number;
  sessionDuration: number;
  availability: AvailabilitySlot[];
  certificates: Certificate[];
  totalSessions: number;
  rating: number;
  ratingCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  createdAt: string;
}

export interface AvailabilitySlot {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  slots: { start: string; end: string }[];
}

export interface Comment {
  _id: string;
  user: User;
  text: string;
  likes: string[];
  createdAt: string;
}

export interface Post {
  _id: string;
  author: User;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  category: SkillCategory;
  tags: string[];
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  likes: string[];
  comments: Comment[];
  views: number;
  saves: string[];
  hasTest: boolean;
  testId?: string;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
}

export interface Session {
  _id: string;
  creator: User;
  learner: User;
  scheduledAt: string;
  duration: number;
  timezone: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  jitsiRoomUrl: string;
  jitsiRoomId: string;
  skillTopic: string;
  notes: string;
  price: number;
  paymentStatus: 'free' | 'pending' | 'paid' | 'refunded';
  creatorRating?: number;
  learnerRating?: number;
  creatorReview?: string;
  learnerReview?: string;
  createdAt: string;
}

export interface TestQuestion {
  question: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Test {
  _id: string;
  creator: User;
  skill: string;
  category: SkillCategory;
  title: string;
  description: string;
  questions: TestQuestion[];
  timeLimit: number;
  passingScore: number;
  myAttempt?: {
    score: number;
    passed: boolean;
    completedAt: string;
  };
  createdAt: string;
}

export interface Certificate {
  _id: string;
  holder: User;
  issuer: User;
  skill: string;
  category: SkillCategory;
  score: number;
  pdfUrl?: string;
  verificationCode: string;
  isValid: boolean;
  issuedAt: string;
  expiresAt?: string;
}

export interface Notification {
  _id: string;
  sender?: User;
  type: string;
  title: string;
  message?: string;
  refModel?: string;
  refId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  posts?: T[];
  total: number;
  page: number;
  hasMore: boolean;
}
