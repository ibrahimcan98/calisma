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
    date: Date;
    amountChanged: number;
    newBalance: number;
    description: string;
};

export type Period = 'weekly' | 'monthly';