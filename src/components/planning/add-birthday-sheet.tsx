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
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const formSchema = z.object({
  name: z.string().min(2, { message: 'İsim gereklidir.' }),
  date: z.string().min(1, { message: 'Tarih gereklidir.' }),
  notes: z.string().optional(),
});

type AddBirthdaySheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddBirthdaySheet({ isOpen, onOpenChange }: AddBirthdaySheetProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', date: '', notes: '' },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    const ref = collection(firestore, 'users', user.uid, 'birthdays');
    addDocumentNonBlocking(ref, {
      creatorUserId: user.uid,
      personName: values.name,
      birthDate: new Date(values.date),
      notes: values.notes,
      isShared: true,
    });
    form.reset();
    onOpenChange(false);
    toast({ title: 'Doğum Günü Eklendi', description: 'Yıllık hatırlatma oluşturuldu.' });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Yeni Doğum Günü</SheetTitle>
          <SheetDescription>Kişi bilgilerini girin, her yıl hatırlatalım.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kişi Adı</FormLabel>
                  <FormControl><Input placeholder="örn. Ayşe Yılmaz" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doğum Tarihi</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Not (Opsiyonel)</FormLabel>
                  <FormControl><Input placeholder="Hediye fikri vb." {...field} /></FormControl>
                </FormItem>
              )}
            />
            <SheetFooter className="pt-4">
              <Button type="submit" className="w-full">Kaydet</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
