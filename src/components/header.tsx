'use client';

import { Wallet, User, LogOut, LayoutDashboard, BookOpen, Calendar, UserCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser, useAuth } from '@/firebase';
import Link from 'next/link';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/', label: 'Gösterge Paneli', icon: LayoutDashboard },
    { href: '/lessons', label: 'Ders Takibi', icon: BookOpen },
    { href: '/planning', label: 'Çalışma & Planlama', icon: Calendar },
    { href: '/profile', label: 'Profil', icon: UserCircle },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground hidden sm:block">
              FinTrack
            </h1>
          </Link>

          {/* Masaüstü Navigasyon */}
          {!isUserLoading && user && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isUserLoading && <Skeleton className="h-9 w-9 rounded-full" />}
          
          {!isUserLoading && !user && (
            <Button asChild variant="default" size="sm">
              <Link href="/login">Giriş Yap</Link>
            </Button>
          )}

          {!isUserLoading && user && (
            <div className="flex items-center gap-2">
              {/* Mobil Navigasyon (Dropdown içinde kalmaya devam eder) */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <LayoutDashboard className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Menü</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {navItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center">
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Kullanıcı Ayarları ve Çıkış */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full border">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Hesabım</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> Profil Ayarları
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
