import type { LucideIcon } from 'lucide-react';

export type TransactionType = 'Income' | 'Expense';

export type Transaction = {
  id: string;
  date: Date;
  amount: number;
  type: TransactionType;
  category: string;
  subCategory?: string;
  description: string;
};

export type Category = {
  value: string;
  label: string;
  icon: LucideIcon;
  subCategories?: { value: string; label: string }[];
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: Date;
};

export type Subscription = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'monthly' | 'yearly';
  startDate: Date;
};

export type Student = {
  id: string;
  userId: string;
  name: string;
  balance: number;
  lessonPrice: number;
  createdAt: Date;
};

export type LessonLog = {
    id: string;
    userId: string;
    studentId: string;
    studentName: string;
    date: Date;
    lessonPrice: number;
};

export type BalanceLog = {
    id: string;
    userId: string;
    studentId: string;
    studentName: string;
    date: Date;
    amountChanged: number;
    newBalance: number;
    description: string;
};

export type Period = 'weekly' | 'monthly';

// --- PLANNING TYPES ---

export type EventType = 'Work' | 'Private' | 'Shift' | 'Birthday';

export type CalendarEvent = {
  id: string;
  creatorUserId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  eventType: EventType;
  isShared: boolean;
  recurrenceRule?: string;
  color?: string; // Hex or tailwind class
};

export type WorkScheduleType = 'Fixed' | 'Shift' | 'Flexible';

export type WorkRule = {
  id: string;
  userId: string;
  title: string;
  workScheduleType: WorkScheduleType;
  defaultDailyStartTime: string; // "09:00"
  defaultDailyEndTime: string;   // "18:00"
  daysOfWeek: string[];          // ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
  customBreakDurationMinutes?: number;
  isActive: boolean;
  color?: string; // Color for the shift
  hourlyRate?: number; // Added: Rate per hour for salary calculation
};

export type WorkLog = {
  id: string;
  userId: string;
  date: Date;
  actualStartTime: Date;
  actualEndTime: Date;
  actualBreakDurationMinutes: number;
  totalWorkDurationMinutes: number;
  overtimeMinutes?: number;
  isBusy: boolean;
  workRuleId?: string;
  notes?: string;
  color?: string; // Inherited from rule
  earningsAtTime?: number; // Store how much was earned at that log
};

export type Birthday = {
  id: string;
  creatorUserId: string;
  personName: string;
  birthDate: Date;
  notes?: string;
  isShared: boolean;
};
