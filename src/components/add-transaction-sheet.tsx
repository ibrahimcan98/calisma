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
import { tr } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import type { Category, Transaction } from '@/lib/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  type: z.enum(['Income', 'Expense'], {
    required_error: 'Lütfen bir işlem türü seçin.',
  }),
  amount: z.coerce.number().positive({ message: 'Tutar pozitif olmalıdır.' }),
  date: z.date({
    required_error: 'Bir tarih gereklidir.',
  }),
  category: z.string().min(1, { message: 'Lütfen bir kategori seçin.' }),
  subCategory: z.string().optional(),
  description: z.string().min(2, {
    message: 'Açıklama en az 2 karakter olmalıdır.',
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
      title: 'Başarılı!',
      description: 'İşleminiz eklendi.',
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
          <SheetTitle>Yeni İşlem Ekle</SheetTitle>
          <SheetDescription>
            Gelir veya giderinizin detaylarını girin.
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
                    <FormLabel>Tür</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="İşlem türünü seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Income">Gelir</SelectItem>
                        <SelectItem value="Expense">Gider</SelectItem>
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
                    <FormLabel>Tutar</FormLabel>
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
                    <FormLabel>Tarih</FormLabel>
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
                              format(field.value, 'PPP', { locale: tr })
                            ) : (
                              <span>Bir tarih seçin</span>
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
                          locale={tr}
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
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Bir kategori seçin" />
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
                          <Plus className="h-4 w-4" /> Yeni kategori ekle
                        </button>
                      </SelectContent>
                    </Select>
                    {isAddingCategory && (
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="Yeni kategori adı"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button type="button" onClick={handleAddCategory}>Ekle</Button>
                        <Button type="button" variant="ghost" onClick={() => setIsAddingCategory(false)}>İptal</Button>
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
                      <FormLabel>Alt Kategori</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Bir alt kategori seçin" />
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
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="örn. Arkadaşla kahve" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="outline">İptal</Button>
                </SheetClose>
                <Button type="submit">İşlemi Ekle</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
