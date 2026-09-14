'use client';

import { useState, useMemo } from 'react';
import { 
  Home, Users, CalendarDays, BookOpen, FileText, MessageSquare, 
  StickyNote, BarChart2, Settings, Search, Plus, Calendar as CalendarIcon,
  Send, MoreHorizontal, ChevronRight, ChevronLeft, LogOut
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, updateDoc, doc } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function AdminDashboard() {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [activeTab, setActiveTab] = useState('Ana Sayfa');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState('');

  const menuItems = [
    { name: 'Ana Sayfa', icon: Home },
    { name: 'Öğrencilerim', icon: Users },
    { name: 'Ders Takvimi', icon: CalendarDays },
    { name: 'Ödevler', icon: BookOpen },
    { name: 'Kaynaklar', icon: FileText },
    { name: 'Mesajlar', icon: MessageSquare, badge: 2 },
    { name: 'Notlar', icon: StickyNote },
    { name: 'Raporlar', icon: BarChart2 },
    { name: 'Ayarlar', icon: Settings },
  ];

  // Fetch real students from Firestore
  const studentsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'students');
  }, [firestore, user]);
  
  const { data: rawStudents } = useCollection<Omit<Student, 'id'>>(studentsCollectionRef);

  const students = useMemo(() => {
    if (!rawStudents) return [];
    return rawStudents.map(s => ({
      ...s,
      // Add defaults for new portal fields if they don't exist yet
      avatar: s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`,
      country: s.country || 'Türkiye',
      flag: s.country === 'Almanya' ? '🇩🇪' : s.country === 'Hollanda' ? '🇳🇱' : s.country === 'ABD' ? '🇺🇸' : '🇹🇷',
      color: s.themeColor || '#6b8e7c',
      nextLesson: 'Planlanmadı',
      status: s.isActive === false ? 'Pasif' : 'Aktif'
    })).filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [rawStudents, searchQuery]);

  const selectedStudent = useMemo(() => {
    if (!students.length) return null;
    if (selectedStudentId) {
      return students.find(s => s.id === selectedStudentId) || students[0];
    }
    return students[0];
  }, [students, selectedStudentId]);

  const handleUpdatePin = async () => {
    if (!user || !selectedStudent || !editingPin) return;
    try {
      const studentRef = doc(firestore, 'users', user.uid, 'students', selectedStudent.id);
      await updateDoc(studentRef, { pin: editingPin });
      setEditingPin('');
      alert('PIN başarıyla güncellendi!');
    } catch (e) {
      console.error(e);
      alert('PIN güncellenirken hata oluştu.');
    }
  };

  return (
    <div className="flex h-screen bg-[#fcfbf9] overflow-hidden font-sans text-slate-800">
      
      {/* 1. SIDEBAR */}
      <aside className="w-64 border-r border-[#eef3f0] bg-white flex flex-col justify-between py-4 px-3 overflow-y-auto shrink-0">
        <div>
          <div className="mb-6 px-2">
            <h1 className="text-xl font-bold text-[#2d4a3e] flex items-center gap-2">
              Kelimeyle <br/> Daha Fazlası
              <span className="text-lg">🌿</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-1">Türkçe, daha geniş bir dünya</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  activeTab === item.name 
                    ? 'bg-[#eef3f0] text-[#2d4a3e] font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${activeTab === item.name ? 'text-[#6b8e7c]' : 'text-slate-400'}`} />
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="bg-[#e89b7b] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-4 px-2">
          <div className="bg-[#fff9eb] p-3 rounded-2xl relative">
            <p className="text-xs text-slate-700 italic">
              "İyi bir öğretmen, daha iyi hikâyelere yol açar." 💛
            </p>
          </div>
          <button onClick={() => auth.signOut()} className="flex items-center gap-2 mt-4 text-slate-400 hover:text-red-500 transition-colors text-sm px-2 pb-2">
            <LogOut className="h-4 w-4" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <header className="h-20 border-b border-[#eef3f0] bg-white/50 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[#2d4a3e] flex items-center gap-2">
              Merhaba Tuba! ☀️
            </h2>
            <p className="text-sm text-slate-500 italic">"Doğru kelimeler, doğru insanlara ulaşınca, dünya biraz daha aydınlık olur." 🍃</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button className="bg-[#6b8e7c] hover:bg-[#5a7868] text-white rounded-xl"><Plus className="h-4 w-4 mr-2"/> Yeni Öğrenci</Button>
            <Button className="bg-[#e89b7b] hover:bg-[#d58c6e] text-white rounded-xl"><Plus className="h-4 w-4 mr-2"/> Ders Ekle</Button>
            <Button className="bg-[#b098c4] hover:bg-[#9d84b2] text-white rounded-xl"><Plus className="h-4 w-4 mr-2"/> Ödev Ekle</Button>
            
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-bold text-[#2d4a3e]">Tuba</p>
                <p className="text-xs text-slate-500">Türkçe Öğretmeni</p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-[#eef3f0]">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Tuba" />
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Conditional Content based on activeTab */}
        {activeTab === 'Ana Sayfa' || activeTab === 'Öğrencilerim' ? (
        <main className="flex-1 overflow-hidden flex">
          
          {/* COLUMN 1: Student List */}
          <div className="w-80 border-r border-[#eef3f0] bg-white overflow-y-auto p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#2d4a3e] text-lg">Öğrencilerim <span className="text-slate-400 text-sm font-normal">(4)</span></h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Öğrenci adı ile ara..." 
                className="pl-9 bg-[#fcfbf9] border-none rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              {students.length === 0 && (
                <div className="text-center p-4 text-slate-400 text-sm">Öğrenci bulunamadı.</div>
              )}
              {students.map((s, idx) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`p-3 rounded-2xl cursor-pointer border-2 transition-all flex items-center justify-between group ${s.id === selectedStudent?.id ? 'border-[#6b8e7c] bg-[#eef3f0]/50' : 'border-transparent hover:border-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={s.avatar} />
                        <AvatarFallback>{s.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: s.color }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#2d4a3e]">{s.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>{s.flag}</span>
                        <span>{s.country}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Sonraki: {s.nextLesson}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 ${s.id === selectedStudent?.id ? 'text-[#6b8e7c]' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: Selected Student Details */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#fcfbf9]">
             {!selectedStudent ? (
               <div className="flex items-center justify-center h-full text-slate-400">Öğrenci seçin veya ekleyin.</div>
             ) : (
               <>
             {/* Profile Header */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] relative">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="absolute top-4 right-4 text-slate-500 rounded-xl">
                      {selectedStudent.pin ? `PIN: ${selectedStudent.pin}` : 'PIN Belirle'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xs rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-[#2d4a3e]">PIN Belirle ({selectedStudent.name})</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                      <Input 
                        placeholder="Örn: 1453" 
                        maxLength={4}
                        value={editingPin}
                        onChange={e => setEditingPin(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-2xl tracking-[0.5em] h-14"
                      />
                      <Button onClick={handleUpdatePin} className="bg-[#6b8e7c] text-white rounded-xl">Kaydet</Button>
                      <p className="text-xs text-slate-500 text-center">Mevcut PIN: {selectedStudent.pin || 'Yok'}</p>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="flex gap-6 items-center">
                  <Avatar className="h-24 w-24 rounded-2xl border-4 border-[#eef3f0]">
                    <AvatarImage src={selectedStudent.avatar} />
                    <AvatarFallback>{selectedStudent.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-3xl font-black text-[#2d4a3e] flex items-center gap-2">
                      {selectedStudent.name} <span className="text-xl">🤍</span>
                    </h2>
                    <p className="text-slate-500 mt-1">{selectedStudent.flag} {selectedStudent.country} <span className="mx-2">|</span> 16 yaş</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedStudent.color }} />
                      <span className="text-sm font-medium" style={{ color: selectedStudent.color }}>{selectedStudent.status}</span>
                    </div>
                  </div>
                  
                  <div className="ml-auto text-right text-slate-600 italic text-sm max-w-[200px] bg-[#fff9eb] p-3 rounded-xl border border-amber-100">
                    "{selectedStudent.improvementGoal || 'Zor kelimeleri öğrendikçe kendime daha çok güveniyorum.'}"
                    <p className="font-bold text-xs mt-1">- {selectedStudent.preferredName || selectedStudent.name} 🤍</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl"><CalendarIcon className="h-5 w-5 text-slate-400"/></div>
                    <div>
                      <p className="text-xs text-slate-400">Başlangıç tarihi</p>
                      <p className="font-bold text-slate-700">12 Eylül 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl"><BarChart2 className="h-5 w-5 text-slate-400"/></div>
                    <div>
                      <p className="text-xs text-slate-400">Mevcut seviye</p>
                      <p className="font-bold text-slate-700">B1 – Orta</p>
                    </div>
                  </div>
                </div>
             </div>

             {/* Strengths & Weaknesses */}
             <div className="grid grid-cols-2 gap-6 mt-6">
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">⭐</div>
                 <h3 className="font-bold text-[#e89b7b] text-lg mb-4 flex items-center gap-2">⭐ Güçlü Yönleri</h3>
                 <ul className="space-y-2 text-sm text-slate-600 font-medium">
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#e89b7b]"/> Hızlı kavrama</li>
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#e89b7b]"/> Zengin hayal gücü</li>
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#e89b7b]"/> Yazılı anlatım becerisi</li>
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#e89b7b]"/> Yeni kelimelere açık</li>
                 </ul>
                 <div className="mt-4 transform -rotate-2 text-[#6b8e7c] text-xs font-bold font-serif italic text-right">
                   Yaratıcı yazılarda<br/>harika işler çıkarıyor! ♡
                 </div>
               </div>
               <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">📈</div>
                 <h3 className="font-bold text-[#b098c4] text-lg mb-4 flex items-center gap-2">📈 Güçlendirdiğimiz Alanlar</h3>
                 <ul className="space-y-2 text-sm text-slate-600 font-medium">
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#b098c4]"/> Konuşma akıcılığı</li>
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#b098c4]"/> Akademik kelime dağarcığı</li>
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#b098c4]"/> Dinleme-anlama</li>
                   <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#b098c4]"/> Deyimler ve kalıplar</li>
                 </ul>
                 <div className="mt-4 transform rotate-2 text-[#e89b7b] text-xs font-bold font-serif italic text-right">
                   Adım adım<br/>daha da iyiye! 🚀
                 </div>
               </div>
             </div>

             {/* Achievements */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] mt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-[#2d4a3e] text-lg flex items-center gap-2">🎯 Bu Yılın Kazanımları</h3>
                  <span className="text-sm text-slate-400">Toplam 8 kazanım</span>
                </div>
                
                <div className="flex justify-between text-center gap-2 mb-6">
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Henüz başlamadık</p>
                    <p className="font-black text-xl text-slate-700">1</p>
                  </div>
                  <div className="flex-1 bg-[#fff9eb] p-3 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-600 mb-1">Üzerinde çalışıyoruz</p>
                    <p className="font-black text-xl text-amber-700">3</p>
                  </div>
                  <div className="flex-1 bg-[#eef3f0] p-3 rounded-xl border border-[#d3e3d9]">
                    <p className="text-xs text-[#6b8e7c] mb-1">Neredeyse tamam</p>
                    <p className="font-black text-xl text-[#2d4a3e]">2</p>
                  </div>
                  <div className="flex-1 bg-[#6b8e7c] p-3 rounded-xl border border-[#5a7868]">
                    <p className="text-xs text-[#eef3f0] mb-1">Başardım</p>
                    <p className="font-black text-xl text-white">2</p>
                  </div>
                </div>

                <div className="space-y-4 relative">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-[#6b8e7c] flex items-center justify-center text-white text-xs">✓</div>
                    <p className="text-sm font-medium text-slate-700">Türkçe kendini tanıtma metni yazabilme</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-[#e89b7b] flex items-center justify-center text-white text-xs">✍️</div>
                    <p className="text-sm font-medium text-slate-700">Günlük yaşamda sık kullanılan fiilleri doğru yerde kullanabilme</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center bg-white" />
                    <p className="text-sm font-medium text-slate-400">Kısa bir hikâye yazabilme</p>
                  </div>
                  <div className="absolute right-0 bottom-0 transform -rotate-3 text-[#6b8e7c] text-sm font-bold font-serif italic text-right max-w-[150px]">
                    Her kazanım senin hikâyende yeni bir sayfa. ♡
                  </div>
                </div>
             </div>

             {/* Message Input */}
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] mt-6 mb-12">
               <h3 className="font-bold text-[#2d4a3e] text-lg mb-4 flex items-center gap-2">✉️ Tuba'dan Mesaj</h3>
               <div className="flex gap-2">
                 <Input className="h-12 bg-slate-50 border-none rounded-xl" placeholder={`${selectedStudent.preferredName || selectedStudent.name}'a bir mesaj yaz...`} />
                 <Button className="h-12 px-6 bg-[#6b8e7c] hover:bg-[#5a7868] text-white rounded-xl"><Send className="h-4 w-4 mr-2"/> Gönder</Button>
               </div>
             </div>
             </>
             )}
          </div>

          {/* COLUMN 3: Right Sidebar (Calendar & Feed) */}
          <div className="w-80 border-l border-[#eef3f0] bg-white overflow-y-auto p-6 flex flex-col gap-6">
            
            {/* Calendar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#2d4a3e] flex items-center gap-2"><CalendarIcon className="h-4 w-4"/> Yaklaşan Derslerim</h3>
                <button className="text-xs text-slate-400 hover:text-[#6b8e7c]">Tümünü Gör →</button>
              </div>
              
              {/* Mini Calendar visualization */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <ChevronLeft className="h-4 w-4 text-slate-400 cursor-pointer"/>
                  <span className="font-bold text-sm text-slate-700">Nisan 2025</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 cursor-pointer"/>
                </div>
                <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 mb-2">
                  <div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cts</div><div>Paz</div>
                </div>
                <div className="grid grid-cols-7 text-center text-sm gap-y-2">
                  <div className="text-slate-300">31</div>
                  <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
                  <div>7</div><div>8</div><div>9</div><div>10</div><div>11</div><div>12</div><div>13</div>
                  <div className="bg-[#6b8e7c] text-white rounded-full h-7 w-7 flex items-center justify-center mx-auto">14</div>
                  <div>15</div>
                  <div className="bg-[#eef3f0] text-[#6b8e7c] font-bold rounded-full h-7 w-7 flex items-center justify-center mx-auto">16</div>
                  <div>17</div>
                  <div className="bg-[#fff9eb] text-amber-600 font-bold rounded-full h-7 w-7 flex items-center justify-center mx-auto">18</div>
                  <div>19</div><div>20</div>
                  <div>21</div><div>22</div><div>23</div><div>24</div><div>25</div><div>26</div><div>27</div>
                </div>
              </div>

              {/* Agenda */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>14 Nisan Pazartesi</span>
                  <span className="bg-[#eef3f0] text-[#6b8e7c] px-2 py-0.5 rounded-full">2 ders</span>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-1 rounded-full bg-[#e89b7b]" />
                  <div className="flex-1 bg-white border border-slate-100 p-3 rounded-xl shadow-sm cursor-pointer hover:border-slate-200 transition-colors">
                    <p className="text-xs font-bold text-slate-700">17:00</p>
                    <p className="text-sm font-medium text-[#2d4a3e] mt-0.5">Ada ile Türkçe Dersi</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><span>🎥</span> Online</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-1 rounded-full bg-[#b098c4]" />
                  <div className="flex-1 bg-white border border-slate-100 p-3 rounded-xl shadow-sm cursor-pointer hover:border-slate-200 transition-colors">
                    <p className="text-xs font-bold text-slate-700">19:00</p>
                    <p className="text-sm font-medium text-[#2d4a3e] mt-0.5">Yetişkin Grubu - Konuşma</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><span>🎥</span> Online</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Feed */}
            <div className="mt-4 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#2d4a3e] flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Son Geri Bildirim</h3>
                <button className="text-xs text-slate-400 hover:text-[#6b8e7c]">Tümünü Gör →</button>
              </div>

              <div className="bg-[#fcfbf9] rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6"><AvatarImage src={students[0]?.avatar}/></Avatar>
                    <div>
                      <p className="text-xs font-bold text-[#2d4a3e]">Ada</p>
                      <p className="text-[9px] text-slate-400">12 Nisan 2025</p>
                    </div>
                  </div>
                  <div className="text-amber-400 text-xs">⭐⭐⭐⭐⭐</div>
                </div>
                <p className="text-xs text-slate-600 italic">"Bugünkü ders çok keyifliydi! Deyimleri çalışmak hem eğlenceliydi hem de aklımda kaldı. Teşekkür ederim öğretmenim. 🌿"</p>
              </div>
            </div>

          </div>
        </main>
        ) : (
          <main className="flex-1 overflow-hidden flex items-center justify-center bg-[#fcfbf9]">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-50">🚧</div>
              <h3 className="text-xl font-bold text-[#2d4a3e]">{activeTab} Modülü</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                Bu modül henüz yapım aşamasında. Çok yakında burada yeni özellikler göreceksiniz! 🌿
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
