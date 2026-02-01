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
import type { Category } from '@/lib/types';

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
