'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Plus, Trash2, PlusCircle } from 'lucide-react';
import type { Category, Transaction } from '@/lib/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { startOfDay } from 'date-fns';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';

const itemSchema = z.object({
  type: z.enum(['Income', 'Expense'], {
    required_error: 'Lütfen bir işlem türü seçin.',
  }),
  amount: z.coerce.number().positive({ message: 'Tutar pozitif olmalıdır.' }),
  category: z.string().min(1, { message: 'Lütfen bir kategori seçin.' }),
  subCategory: z.string().optional(),
  description: z.string().min(2, {
    message: 'Açıklama en az 2 karakter olmalıdır.',
  }),
});

const formSchema = z.object({
  date: z.string().min(1, { message: 'Bir tarih gereklidir.' }),
  items: z.array(itemSchema).min(1, { message: 'En az bir işlem eklemelisiniz.' }),
});

type AddTransactionSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  categories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  onAddCategory: (category: Omit<Category, 'icon'>) => Category;
};

export function AddTransactionSheet({
  isOpen,
  onOpenChange,
  categories,
  onAddTransaction,
  onAddCategory,
}: AddTransactionSheetProps) {
  const [isAddingCategory, setIsAddingCategory] = useState<{itemIndex: number} | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      items: [{
        type: 'Expense',
        amount: '' as any,
        category: '',
        subCategory: '',
        description: '',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const localDate = new Date(`${values.date}T00:00:00`);
    const finalDate = startOfDay(localDate);

    // Call onAddTransaction for each item in the batch
    values.items.forEach(item => {
      onAddTransaction({
        ...item,
        date: finalDate,
      });
    });

    form.reset({
      date: new Date().toISOString().split('T')[0],
      items: [{
        type: 'Expense',
        amount: '' as any,
        category: '',
        subCategory: '',
        description: '',
      }],
    });
    onOpenChange(false);
    toast({
      title: 'Başarılı!',
      description: `${values.items.length} işlem başarıyla eklendi.`,
    });
  }

  function handleAddCategory(itemIndex: number) {
    if (newCategoryName.trim()) {
      const addedCategory = onAddCategory({
        value: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-'),
        label: newCategoryName.trim(),
      });
      form.setValue(`items.${itemIndex}.category`, addedCategory.value, { shouldValidate: true });
      setNewCategoryName('');
      setIsAddingCategory(null);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-xl w-full">
        <SheetHeader>
          <SheetTitle>Çoklu İşlem Ekle</SheetTitle>
          <SheetDescription>
            Bir tarih seçin ve o güne ait tüm gelir/giderlerinizi tek seferde girin.
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow space-y-6 mt-6 overflow-hidden">
            
            {/* Date Picker (Global for the batch) */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <FormLabel className="text-xs font-bold uppercase text-slate-400">İşlem Tarihi</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="bg-transparent border-none text-lg font-bold p-0 focus-visible:ring-0 h-auto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* List of Transactions */}
            <div className="flex-grow overflow-auto pr-2 space-y-6">
              {fields.map((field, index) => (
                <Card key={field.id} className="relative border-slate-200 shadow-sm rounded-3xl group">
                  {fields.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 rounded-full"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="bg-primary/10 text-primary h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                       </div>
                       <h4 className="text-sm font-bold text-slate-700">İşlem Detayı</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <FormField
                        control={form.control}
                        name={`items.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-400">Tür</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="Tür" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl">
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
                        name={`items.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase font-bold text-slate-400">Tutar</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.category`}
                      render={({ field }) => {
                        const selectedCategory = categories.find(c => c.value === field.value);
                        return (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-slate-400">Kategori</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Kategori seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              {categories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  <div className="flex items-center gap-2">
                                    <cat.icon className="h-4 w-4" />
                                    {cat.label}
                                  </div>
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                              <button
                                type="button"
                                onClick={() => setIsAddingCategory({itemIndex: index})}
                                className="w-full text-xs flex items-center gap-2 p-2 hover:bg-accent rounded-md text-primary font-medium"
                              >
                                <Plus className="h-4 w-4" /> Yeni Kategori Ekle
                              </button>
                            </SelectContent>
                          </Select>
                          
                          {isAddingCategory?.itemIndex === index && (
                            <div className="flex gap-2 mt-2 p-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              <Input 
                                placeholder="Yeni kategori..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="h-8 text-xs rounded-lg"
                              />
                              <Button type="button" size="sm" onClick={() => handleAddCategory(index)} className="h-8 rounded-lg">Ekle</Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingCategory(null)} className="h-8 rounded-lg">X</Button>
                            </div>
                          )}

                          {selectedCategory?.subCategories && selectedCategory.subCategories.length > 0 && (
                            <div className="mt-3">
                               <FormField
                                  control={form.control}
                                  name={`items.${index}.subCategory`}
                                  render={({ field: subField }) => (
                                    <FormItem>
                                      <Select onValueChange={subField.onChange} value={subField.value}>
                                        <FormControl>
                                          <SelectTrigger className="h-8 text-xs rounded-lg border-dashed">
                                            <SelectValue placeholder="Alt kategori seçin (opsiyonel)" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-xl">
                                          {selectedCategory.subCategories?.map((subCat) => (
                                            <SelectItem key={subCat.value} value={subCat.value} className="text-xs">
                                              {subCat.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase font-bold text-slate-400">Açıklama</FormLabel>
                          <FormControl>
                            <Input placeholder="örn. Market harcaması" {...field} className="rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}

              <Button 
                type="button" 
                variant="outline" 
                className="w-full py-6 border-dashed border-slate-300 rounded-3xl hover:bg-slate-50 text-slate-500 gap-2"
                onClick={() => append({ type: 'Expense', amount: '' as any, category: '', description: '' })}
              >
                <PlusCircle className="h-5 w-5" />
                Başka Bir Kalem Ekle
              </Button>
            </div>

            <SheetFooter className="flex-row gap-2 mt-auto pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-2xl h-12">Vazgeç</Button>
              </SheetClose>
              <Button type="submit" className="flex-1 rounded-2xl h-12 bg-primary shadow-lg">
                Tümünü Kaydet ({fields.length})
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
