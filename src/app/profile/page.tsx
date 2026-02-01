'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, User as UserIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
            <div className="p-4 bg-secondary rounded-full mb-4">
              <UserIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          <CardTitle className="text-2xl">Profil</CardTitle>
          <CardDescription>Profil bilgilerinizi burada görebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">E-posta</p>
            <p className="text-lg font-semibold">{user.email}</p>
          </div>
           <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Kullanıcı ID</p>
            <p className="text-sm text-foreground break-all">{user.uid}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Çıkış Yap
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
