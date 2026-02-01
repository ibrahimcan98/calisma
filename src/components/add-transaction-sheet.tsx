'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Circle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import type { Category, Transaction } from '@/lib/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  type: z.enum(['Income', 'Expense'], {
    required_error: 'Please select a transaction type.',
  }),
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
  date: z.date({
    required_error: 'A date is required.',
  }),
  category: z.string().min(1, { message: 'Please select a category.' }),
  subCategory: z.string().optional(),
  description: z.string().min(2, {
    message: 'Description must be at least 2 characters.',
  }),
});

type AddTransactionSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  categories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddCategory: (category: Omit<Category, 'icon'>) => Category;
};

export function AddTransactionSheet({
  isOpen,
  onOpenChange,
  categories,
  onAddTransaction,
  onAddCategory,
}: AddTransactionSheetProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'Expense',
      amount: 0,
      date: new Date(),
      description: '',
    },
  });

  const selectedCategory = categories.find(c => c.value === form.watch('category'));

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddTransaction(values);
    form.reset();
    onOpenChange(false);
    toast({
      title: 'Success!',
      description: 'Your transaction has been added.',
    });
  }

  function handleAddCategory() {
    if (newCategory.trim()) {
      const addedCategory = onAddCategory({
        value: newCategory.trim().toLowerCase().replace(/\s+/g, '-'),
        label: newCategory.trim(),
      });
      form.setValue('category', addedCategory.value);
      setNewCategory('');
      setIsAddingCategory(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Add a New Transaction</SheetTitle>
          <SheetDescription>
            Enter the details of your income or expense.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow space-y-4">
            <div className="flex-grow overflow-auto pr-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Income">Income</SelectItem>
                        <SelectItem value="Expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsAddingCategory(true)}
                          className="w-full text-sm flex items-center gap-2 p-2 hover:bg-accent rounded-sm"
                        >
                          <Plus className="h-4 w-4" /> Add new category
                        </button>
                      </SelectContent>
                    </Select>
                    {isAddingCategory && (
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="New category name"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button type="button" onClick={handleAddCategory}>Add</Button>
                        <Button type="button" variant="ghost" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedCategory?.subCategories && selectedCategory.subCategories.length > 0 && (
                <FormField
                  control={form.control}
                  name="subCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sub-category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedCategory.subCategories.map((subCat) => (
                            <SelectItem key={subCat.value} value={subCat.value}>
                              {subCat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Coffee with a friend" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit">Add Transaction</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
