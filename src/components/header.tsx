'use client'; // Make it a client component

import { Wallet, User, LogOut, LayoutDashboard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser, useAuth } from '@/firebase';
import Link from 'next/link';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-headline">
            FinTrack Personal
          </h1>
        </Link>
        
        {isUserLoading && <Skeleton className="h-9 w-9 rounded-full" />}
        
        {!isUserLoading && !user && (
          <Button asChild>
            <Link href="/login">Giriş Yap</Link>
          </Button>
        )}

        {!isUserLoading && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                  <Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" /> Gösterge Paneli</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
