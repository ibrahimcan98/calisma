import {
  Utensils,
  Home,
  ShoppingBag,
  Car,
  HeartPulse,
  Film,
  GraduationCap,
  Gift,
  Circle,
  Briefcase
} from 'lucide-react';
import type { Category, Transaction } from '@/lib/types';
import { startOfDay, subDays, subMonths } from 'date-fns';

export const categories: Category[] = [
  { value: 'food', label: 'Food', icon: Utensils, subCategories: [
    { value: 'groceries', label: 'Groceries' },
    { value: 'restaurants', label: 'Restaurants' },
    { value: 'takeout', label: 'Takeout' },
  ]},
  { value: 'housing', label: 'Housing', icon: Home, subCategories: [
    { value: 'rent', label: 'Rent/Mortgage' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'maintenance', label: 'Maintenance' },
  ]},
  { value: 'shopping', label: 'Shopping', icon: ShoppingBag, subCategories: [
    { value: 'clothing', label: 'Clothing' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'hobbies', label: 'Hobbies' },
  ]},
  { value: 'transportation', label: 'Transportation', icon: Car, subCategories: [
    { value: 'gas', label: 'Gas/Fuel' },
    { value: 'public-transport', label: 'Public Transport' },
    { value: 'repairs', label: 'Repairs' },
  ]},
  { value: 'health', label: 'Health', icon: HeartPulse, subCategories: [
    { value: 'insurance', label: 'Insurance' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'doctor', label: 'Doctor Visit' },
  ]},
  { value: 'entertainment', label: 'Entertainment', icon: Film, subCategories: [
    { value: 'movies', label: 'Movies' },
    { value: 'subscriptions', label: 'Subscriptions' },
    { value: 'events', label: 'Events' },
  ]},
  { value: 'education', label: 'Education', icon: GraduationCap, subCategories: [
    { value: 'tuition', label: 'Tuition' },
    { value: 'books', label: 'Books' },
    { value: 'courses', label: 'Courses' },
  ]},
  { value: 'gifts', label: 'Gifts', icon: Gift, subCategories: []},
  { value: 'salary', label: 'Salary', icon: Briefcase, subCategories: []},
  { value: 'other', label: 'Other', icon: Circle, subCategories: [] },
];

const today = new Date();

export const initialTransactions: Transaction[] = [
  {
    id: '1',
    date: startOfDay(subDays(today, 1)),
    amount: 5000,
    type: 'Income',
    category: 'salary',
    description: 'Monthly Salary',
  },
  {
    id: '2',
    date: startOfDay(subDays(today, 2)),
    amount: 1500,
    type: 'Expense',
    category: 'housing',
    subCategory: 'rent',
    description: 'Rent Payment',
  },
  {
    id: '3',
    date: startOfDay(subDays(today, 3)),
    amount: 75.5,
    type: 'Expense',
    category: 'food',
    subCategory: 'groceries',
    description: 'Weekly Groceries',
  },
  {
    id: '4',
    date: startOfDay(subDays(today, 4)),
    amount: 50,
    type: 'Expense',
    category: 'transportation',
    subCategory: 'gas',
    description: 'Gasoline',
  },
  {
    id: '5',
    date: startOfDay(subDays(today, 5)),
    amount: 14.99,
    type: 'Expense',
    category: 'entertainment',
    subCategory: 'subscriptions',
    description: 'Streaming Service',
  },
  {
    id: '6',
    date: startOfDay(subDays(today, 6)),
    amount: 45.20,
    type: 'Expense',
    category: 'food',
    subCategory: 'restaurants',
    description: 'Dinner with friends',
  },
  {
    id: '7',
    date: startOfDay(subMonths(today, 1)),
    amount: 5000,
    type: 'Income',
    category: 'salary',
    description: 'Previous Month Salary',
  },
  {
    id: '8',
    date: startOfDay(subMonths(today, 1)),
    amount: 1500,
    type: 'Expense',
    category: 'housing',
    subCategory: 'rent',
    description: 'Previous Month Rent',
  },
];
