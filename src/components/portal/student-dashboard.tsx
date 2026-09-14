'use client';

import { useState, useEffect } from 'react';
import { 
  Smile, Calendar, MessageCircle, Star, BookOpen, Clock, AlertCircle, ArrowRight, X, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import type { Student } from '@/lib/types';

export function StudentDashboard({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (studentId === '1234') {
        setStudent({
          id: 'dummy', userId: 'dummy', name: 'Ada', preferredName: 'Ada', 
          themeColor: '#6b8e7c', backgroundTheme: 'doğa', balance: 0, lessonPrice: 0, createdAt: new Date(),
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ada'
        });
        setLoading(false);
        return;
      }

      try {
        const q = query(collectionGroup(firestore, 'students'), where('pin', '==', studentId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data() as Student;
          setStudent({
            ...data,
            id: doc.id,
            avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
            themeColor: data.themeColor || '#6b8e7c',
            preferredName: data.preferredName || data.name
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [firestore, studentId]);

  if (loading || !student) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fcfbf9]">
        <Loader2 className="h-10 w-10 animate-spin text-[#6b8e7c]" />
      </div>
    );
  }

  const renderBackground = () => {
    // Return a soft, nature-inspired SVG pattern or color
    return (
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-30">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaf-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 20 Q 70 5 90 20 Q 100 40 90 60 Q 70 75 50 60 Q 40 40 50 20 Z" fill="#6b8e7c" opacity="0.1" />
              <path d="M10 70 Q 30 55 50 70 Q 60 90 50 110 Q 30 125 10 110 Q 0 90 10 70 Z" fill="#e89b7b" opacity="0.1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#leaf-pattern)" />
        </svg>
      </div>
    );
  };

  const dummyWords = [
    { word: 'Hayal', meaning: 'İnsanın zihninde canlandırdığı şey.', isLearned: true },
    { word: 'Gelenek', meaning: 'Kuşaktan kuşağa aktarılan alışkanlıklar.', isLearned: false },
    { word: 'Cesaret', meaning: 'Korkuya rağmen bir şey yapabilme.', isLearned: true },
  ];

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans pb-20">
      {renderBackground()}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-[#eef3f0]">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-white shadow-md">
              <AvatarImage src={student.avatar} />
              <AvatarFallback>{student.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-[#2d4a3e]">Merhaba, {student.name}! ✨</h1>
              <p className="text-sm text-slate-500">Burası tamamen sana ait.</p>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-slate-500 hover:text-[#6b8e7c]">Profili Düzenle</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl bg-[#fcfbf9] border-[#eef3f0]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#2d4a3e] flex items-center gap-2">
                  Burası Benim 🪴
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#2d4a3e]">Bana şöyle hitap edilsin:</label>
                  <Input defaultValue={student.preferredName} className="rounded-xl border-[#eef3f0]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#2d4a3e]">En sevdiğim renk:</label>
                  <div className="flex gap-2">
                    {['#6b8e7c', '#e89b7b', '#b098c4', '#60a5fa', '#f472b6'].map(c => (
                      <div key={c} className={`w-8 h-8 rounded-full cursor-pointer border-2 ${c === student.themeColor ? 'border-slate-800' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#2d4a3e]">Tuba'nın bilmesini istediğim bir şey:</label>
                  <textarea className="w-full h-20 rounded-xl border border-[#eef3f0] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e7c]" placeholder="Buraya yazabilirsin..." />
                </div>
                <Button className="w-full bg-[#6b8e7c] hover:bg-[#5a7868] text-white rounded-xl h-12">Kaydet</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Feed */}
        <div className="md:col-span-8 space-y-8">
          
          {/* Tuba'dan Mesaj */}
          <div className="bg-[#fff9eb] border border-amber-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-6xl opacity-20">💌</div>
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tuba" />
              </Avatar>
              <div>
                <p className="text-xs font-bold text-amber-700 mb-1">Tuba'dan yeni mesaj • Bugün 09:00</p>
                <p className="text-[#2d4a3e] text-lg font-medium italic">
                  "Günaydın Ada! Bugünkü derste en sevdiğin şarkının sözlerini inceleyeceğiz. Görüşmek üzere! 🎶"
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Button size="sm" variant="outline" className="rounded-full bg-white text-lg hover:bg-[#eef3f0]">❤️</Button>
                  <Button size="sm" variant="outline" className="rounded-full bg-white text-lg hover:bg-[#eef3f0]">🤩</Button>
                  <Button size="sm" variant="outline" className="rounded-full bg-white text-lg hover:bg-[#eef3f0]">👍</Button>
                  <Button size="sm" variant="ghost" className="rounded-full text-xs text-amber-700">Cevapla...</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Bir Sonraki Dersim */}
          <Card className="rounded-3xl border-none shadow-md overflow-hidden bg-white">
            <div className="h-2 w-full bg-[#6b8e7c]" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Bir Sonraki Dersim
                  </h2>
                  <p className="text-2xl font-black text-[#2d4a3e]">14 Nisan Pazartesi</p>
                  <p className="text-lg text-[#6b8e7c] font-bold mt-1">17:00 - 18:00</p>
                </div>
                <div className="bg-[#eef3f0] p-4 rounded-2xl text-center">
                  <Clock className="h-6 w-6 text-[#6b8e7c] mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#2d4a3e]">2 gün kaldı</p>
                </div>
              </div>

              <div className="mt-6 bg-slate-50 rounded-2xl p-4 flex gap-4">
                <div className="flex-1 border-r border-slate-200 pr-4">
                  <p className="text-xs text-slate-500 mb-1 font-bold">Ders Konusu</p>
                  <p className="text-sm text-slate-700">Günlük yaşam kalıpları ve şarkı çevirisi</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1 font-bold">Ödev</p>
                  <p className="text-sm flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" /> "Sezen Aksu - Gülümse" dinlenecek
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bu Hafta Nasılsın? */}
          <Card className="rounded-3xl border-none shadow-sm bg-white p-6">
            <h3 className="text-lg font-bold text-[#2d4a3e] mb-4 flex items-center gap-2">
              <Smile className="h-5 w-5 text-[#e89b7b]" /> Bu hafta nasılsın?
            </h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { emoji: '🤩', label: 'Harika' },
                { emoji: '😊', label: 'İyi' },
                { emoji: '😐', label: 'Fena değil' },
                { emoji: '😔', label: 'Biraz zor' },
                { emoji: '😢', label: 'Kötü' },
              ].map((m) => (
                <button 
                  key={m.label}
                  onClick={() => setMood(m.label)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                    mood === m.label ? 'bg-[#eef3f0] border-2 border-[#6b8e7c] scale-110 shadow-sm' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <span className="text-3xl mb-1">{m.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-600">{m.label}</span>
                </button>
              ))}
            </div>
            {mood && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <p className="text-xs text-slate-500 mb-2 ml-1">Bu hafta Tuba'ya anlatmak istediğin bir şey var mı?</p>
                <div className="flex gap-2">
                  <Input className="bg-slate-50 rounded-xl border-none" placeholder="Buraya yazabilirsin..." />
                  <Button className="bg-[#e89b7b] hover:bg-[#d58c6e] text-white rounded-xl">Kaydet</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Kelimelerim Modal Trigger */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
                <div className="h-1.5 w-full bg-[#b098c4]" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between text-[#2d4a3e]">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[#b098c4]" /> Kelimelerim
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#b098c4] transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-[#2d4a3e] mb-1">42</p>
                  <p className="text-xs text-slate-500">Öğrendiğin yeni kelime!</p>
                  <div className="mt-4 flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-8 flex-1 bg-[#f4f0f7] rounded-md flex items-center justify-center text-xs">
                        🌱
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl bg-[#fcfbf9] border-[#eef3f0] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#b098c4] flex items-center gap-2">
                  <BookOpen className="h-6 w-6" /> Öğrendiğim Kelimeler
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {dummyWords.map((word, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-[#eef3f0] shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-[#2d4a3e] text-lg">{word.word}</h4>
                      {word.isLearned ? (
                        <span className="bg-[#eef3f0] text-[#6b8e7c] text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          ✓ Öğrendim
                        </span>
                      ) : (
                        <span className="bg-[#fff9eb] text-amber-600 text-[10px] font-bold px-2 py-1 rounded-full">
                          Çalışıyorum
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{word.meaning}</p>
                    <div className="bg-slate-50 p-2 rounded-xl text-xs text-slate-500 italic border border-slate-100">
                      "Tuba'nın bir cümlesi veya benim yazdığım bir örnek buraya gelecek."
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Gelecek Derste Ne Yapalım? */}
          <Card className="rounded-3xl border border-[#eef3f0] shadow-none bg-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[#2d4a3e] flex items-center gap-2">
                🎯 Gelecek Derste Ne Yapalım?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">Tuba senin için birkaç seçenek hazırladı. Birini seç!</p>
              <button className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-[#6b8e7c] hover:bg-[#eef3f0] transition-colors text-sm font-medium text-slate-700">
                🎲 Eğlenceli bir Türkçe oyun
              </button>
              <button className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-[#6b8e7c] hover:bg-[#eef3f0] transition-colors text-sm font-medium text-slate-700">
                🗣️ Bol bol konuşma pratiği
              </button>
              <button className="w-full text-left p-3 rounded-xl bg-white border border-slate-100 hover:border-[#6b8e7c] hover:bg-[#eef3f0] transition-colors text-sm font-medium text-slate-700">
                🎵 Bir şarkı üzerinden çalışalım
              </button>
            </CardContent>
          </Card>

          {/* Tuba'ya Notum */}
          <div className="bg-[#2d4a3e] rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
              <MessageCircle className="h-32 w-32" />
            </div>
            <h3 className="text-lg font-bold mb-2 relative z-10">Tuba'ya Notum</h3>
            <p className="text-xs text-[#eef3f0] mb-4 relative z-10 opacity-80">Sormak istediğin bir soru veya ders önerin mi var?</p>
            <textarea 
              className="w-full h-24 bg-white/10 border border-white/20 rounded-xl p-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#e89b7b] resize-none relative z-10"
              placeholder="Buraya yazabilirsin..."
            />
            <div className="flex justify-end mt-3 relative z-10">
              <Button size="sm" className="bg-[#e89b7b] hover:bg-[#d58c6e] text-white rounded-lg">Gönder</Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
