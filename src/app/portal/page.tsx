'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { Loader2, User, Key, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminDashboard } from '@/components/portal/admin-dashboard';
import { StudentDashboard } from '@/components/portal/student-dashboard';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';

export default function PortalPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [studentToken, setStudentToken] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Login states for student
  const [isStudentLogin, setIsStudentLogin] = useState(false);
  const [pinCode, setPinCode] = useState('');

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
      const q = query(collectionGroup(firestore, 'students'), where('pin', '==', pinCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        localStorage.setItem('student_portal_token', pinCode);
        setStudentToken(pinCode);
      } else {
        // Fallback to dummy for testing if no DB students have this PIN yet
        if (pinCode === '1234') {
          localStorage.setItem('student_portal_token', '1234');
          setStudentToken('1234');
        } else {
          alert('Geçersiz PIN Kodu. Lütfen Tuba öğretmeninize danışın.');
        }
      }
    } catch (error) {
      console.error("Error logging in:", error);
      alert('Sisteme bağlanırken bir hata oluştu.');
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
  if (user) {
    return <AdminDashboard />;
  }

  // 2. If Student is logged in via PIN
  if (studentToken) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-50">
          <Button onClick={() => { localStorage.removeItem('student_portal_token'); setStudentToken(null); }} variant="outline" className="bg-white/80 backdrop-blur-sm border-[#eef3f0] shadow-sm text-slate-500 hover:text-red-500">
            Çıkış Yap
          </Button>
        </div>
        <StudentDashboard studentId={studentToken} />
      </div>
    );
  }

  // 3. Login Selection Screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fcfbf9] p-4 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 text-[#6b8e7c] opacity-20">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div className="absolute bottom-10 right-10 text-[#e89b7b] opacity-20">
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden z-10">
        <div className="h-3 w-full bg-gradient-to-r from-[#6b8e7c] via-[#85b09a] to-[#e89b7b]" />
        
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto w-16 h-16 bg-[#eef3f0] rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-[#6b8e7c]" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#2d4a3e]">Kelimeyle Daha Fazlası</CardTitle>
          <CardDescription className="text-base mt-2">Türkçe, daha geniş bir dünya 🌿</CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          {!isStudentLogin ? (
            <div className="space-y-4">
              <Button 
                onClick={() => setIsStudentLogin(true)}
                className="w-full h-14 text-lg rounded-2xl bg-[#6b8e7c] hover:bg-[#5a7868] text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <User className="mr-3 h-5 w-5" /> Öğrenci Girişi
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400">veya</span>
                </div>
              </div>

              <Button 
                onClick={() => router.push('/login?redirect=/portal')}
                variant="outline" 
                className="w-full h-14 text-lg rounded-2xl border-2 border-[#eef3f0] hover:bg-[#eef3f0] text-[#2d4a3e] transition-transform hover:scale-[1.02]"
              >
                <Key className="mr-3 h-5 w-5" /> Öğretmen (Tuba) Girişi
              </Button>
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
