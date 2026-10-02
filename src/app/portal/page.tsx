'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Loader2, User, Key, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminDashboard } from '@/components/portal/admin-dashboard';
import { StudentDashboard } from '@/components/portal/student-dashboard';
import { Header } from '@/components/header';
import { collection, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

function getCachedStudentToken(pin: string) {
  try {
    const rawCache = localStorage.getItem('student_portal_pin_cache');
    if (!rawCache) return null;
    const cache = JSON.parse(rawCache) as Record<string, string>;
    return cache[pin] || null;
  } catch {
    return null;
  }
}

function getCachedLocalStudentToken(pin: string) {
  try {
    const rawCache = localStorage.getItem('student_portal_students_cache');
    if (!rawCache) return null;
    const students = JSON.parse(rawCache) as Array<{ pin?: string }>;
    return students.some((student) => student.pin === pin) ? `local:${pin}` : null;
  } catch {
    return null;
  }
}

export default function PortalPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [studentToken, setStudentToken] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Login states for student
  const [isStudentLogin, setIsStudentLogin] = useState(false);
  const [pinCode, setPinCode] = useState('');

  const ensureStudentFirebaseSession = async () => {
    if (auth.currentUser) return;
    await signInAnonymously(auth);
  };

  useEffect(() => {
    // Check if student is logged in via local storage
    const token = localStorage.getItem('student_portal_token');
    if (token) {
      setStudentToken(token);
    }
    setIsCheckingToken(false);
  }, []);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      await ensureStudentFirebaseSession();
      const cachedToken = getCachedStudentToken(pinCode) || getCachedLocalStudentToken(pinCode);
      if (cachedToken) {
        localStorage.setItem('student_portal_token', cachedToken);
        setStudentToken(cachedToken);
        setIsLoggingIn(false);
        return;
      }

      const q = user
        ? query(collection(firestore, 'users', user.uid, 'students'), where('pin', '==', pinCode))
        : query(collectionGroup(firestore, 'students'), where('pin', '==', pinCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const studentDoc = snap.docs[0];
        const teacherId = user?.uid || studentDoc.ref.parent.parent?.id;
        const token = teacherId ? `student:${teacherId}:${studentDoc.id}` : pinCode;
        localStorage.setItem('student_portal_token', token);
        setStudentToken(token);
      } else {
        alert('Geçersiz PIN Kodu. Lütfen Tuba öğretmeninize danışın.');
      }
    } catch (error: any) {
      console.error("Error logging in:", error);

      const cachedToken = getCachedStudentToken(pinCode) || getCachedLocalStudentToken(pinCode);
      if (cachedToken) {
        await ensureStudentFirebaseSession();
        localStorage.setItem('student_portal_token', cachedToken);
        setStudentToken(cachedToken);
        return;
      }
      
      alert('Bu PIN henüz bu tarayıcıda öğrenci girişi için hazırlanmadı. Öğretmen paneline girip öğrencinin PIN bilgisini bir kez kaydedin, sonra çıkış yapıp aynı PIN ile öğrenci girişi yapın.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading || isCheckingToken) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fcfbf9]">
        <Loader2 className="h-10 w-10 animate-spin text-[#6b8e7c]" />
      </div>
    );
  }

  // 1. If Tuba (Admin) is logged in via Firebase Auth
  if (user && user.email === 'tubakodak8@gmail.com') {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <AdminDashboard />
      </div>
    );
  }

  // If someone else is logged in (not Tuba), we can either force sign out or just not show the admin dashboard.
  // Actually, we should just let them see the login screen (or sign them out).
  // For safety, if user exists but is NOT Tuba, we just show the login screen (they can log in as a student).

  // 2. If Student is logged in via PIN
  if (studentToken) {
    return (
      <div className="relative">
        <div className="fixed bottom-3 right-3 z-50 sm:bottom-auto sm:right-4 sm:top-4">
          <Button size="sm" onClick={() => { localStorage.removeItem('student_portal_token'); setStudentToken(null); }} variant="outline" className="bg-white/90 backdrop-blur-sm border-[#eef3f0] shadow-sm text-slate-500 hover:text-red-500 sm:h-10 sm:px-4">
            Çıkış Yap
          </Button>
        </div>
        <StudentDashboard studentId={studentToken} />
      </div>
    );
  }

  // 3. Login Selection Screen
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#f7fbf8_0%,#fcfaf6_48%,#f8f1ec_100%)] p-4 font-sans">
      <div aria-hidden="true" className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#dfeee6]/70 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#f8ddd0]/65 blur-3xl" />
      <div aria-hidden="true" className="absolute right-[12%] top-[13%] hidden h-24 w-24 rounded-full border border-[#dfc4b7]/60 lg:block" />
      <div aria-hidden="true" className="absolute right-[15%] top-[18%] hidden h-3 w-3 rounded-full bg-[#e89b7b]/55 lg:block" />
      <div aria-hidden="true" className="absolute bottom-[15%] left-[13%] hidden grid-cols-4 gap-3 opacity-35 lg:grid">
        {Array.from({ length: 16 }).map((_, index) => (
          <span key={index} className="h-1.5 w-1.5 rounded-full bg-[#6b8e7c]" />
        ))}
      </div>
      <div aria-hidden="true" className="absolute left-[9%] top-[18%] hidden -rotate-6 items-center gap-2 rounded-full border border-white/90 bg-white/65 px-4 py-2 text-sm font-medium text-[#587565] shadow-sm backdrop-blur-md lg:flex">
        <span className="text-base">Aa</span>
        <span>Keşfet</span>
      </div>
      <div aria-hidden="true" className="absolute bottom-[17%] right-[9%] hidden rotate-6 items-center gap-2 rounded-full border border-white/90 bg-white/65 px-4 py-2 text-sm font-medium text-[#9a654f] shadow-sm backdrop-blur-md lg:flex">
        <Sparkles className="h-4 w-4" />
        <span>Öğren &amp; geliş</span>
      </div>

      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/85 shadow-[0_28px_80px_-30px_rgba(45,74,62,0.38)] backdrop-blur-xl sm:rounded-[2rem]">
        <div className="h-2 w-full bg-gradient-to-r from-[#6b8e7c] via-[#a7bda5] to-[#e89b7b]" />
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#eef3f0]" />
        
        <CardHeader className="relative px-5 pb-3 pt-7 text-center sm:px-8 sm:pt-9">
          <div className="relative mx-auto mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#edf5f0] to-[#dfece4] shadow-[0_10px_30px_-14px_rgba(107,142,124,0.7)] ring-1 ring-white">
            <BookOpen className="h-8 w-8 text-[#5f8472]" />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#f3c8b5] text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#7d9a8c]">Öğrenme portalı</p>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#2d4a3e] sm:text-3xl">Kelimeyle Daha Fazlası</CardTitle>
          <CardDescription className="mt-2 text-[15px] leading-relaxed text-slate-500">Türkçe ile keşfet, öğren ve kendini ifade et.</CardDescription>
        </CardHeader>

        <CardContent className="relative p-5 pt-4 sm:p-8 sm:pt-5">
          {!isStudentLogin ? (
            <div className="space-y-3">
              <Button 
                onClick={() => setIsStudentLogin(true)}
                className="h-14 w-full rounded-2xl bg-[#668b78] text-base font-semibold text-white shadow-[0_12px_24px_-12px_rgba(74,111,91,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#567765] hover:shadow-lg"
              >
                <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                  <User className="h-4 w-4" />
                </span>
                Öğrenci Girişi
              </Button>
              
              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#e5ebe7]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="rounded-full bg-white px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-400">veya</span>
                </div>
              </div>

              <Button 
                onClick={() => router.push('/login?redirect=/portal')}
                variant="outline" 
                className="h-14 w-full rounded-2xl border border-[#dfe9e3] bg-[#f6faf8] text-base font-semibold text-[#355647] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#cbdcd2] hover:bg-[#edf5f0]"
              >
                <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#e2eee7]">
                  <Key className="h-4 w-4" />
                </span>
                Öğretmen (Tuba) Girişi
              </Button>

              <p className="pt-3 text-center text-xs leading-relaxed text-slate-400">Kendi alanına güvenle giriş yap ve kaldığın yerden devam et.</p>
            </div>
          ) : (
             <form onSubmit={handleStudentLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="space-y-2 text-center">
                 <label className="text-sm font-semibold text-[#2d4a3e]">PIN Kodunu Gir</label>
                 <Input 
                   type="password"
                   inputMode="numeric"
                   maxLength={4}
                   placeholder="****"
                   value={pinCode}
                   onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                   className="text-center text-3xl tracking-[1em] h-16 rounded-2xl border-2 focus-visible:ring-[#6b8e7c] focus-visible:border-[#6b8e7c]"
                   autoFocus
                 />
               </div>
               
               <div className="flex gap-3">
                 <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsStudentLogin(false)}
                    className="flex-1 h-12 rounded-xl text-gray-500 hover:text-gray-700"
                  >
                    Geri
                  </Button>
                 <Button 
                    type="submit" 
                    disabled={pinCode.length !== 4}
                    className="flex-[2] h-12 rounded-xl bg-[#e89b7b] hover:bg-[#d58c6e] text-white shadow-md disabled:opacity-50"
                  >
                    Giriş Yap
                  </Button>
               </div>
             </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
