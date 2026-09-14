import { Edit2, MapPin, Gift, Globe, Heart, Coffee, Cat } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Student } from '@/lib/types';

export function ProfileCard({ student }: { student: Student }) {
  const avatars = [
    student.avatar,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
  ];

  return (
    <div className="w-72 shrink-0 flex flex-col gap-6">
      {/* BURASI BENİM KARTI */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#eef3f0] flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-6">
          <h2 className="text-[#e89b7b] font-bold flex items-center gap-2">
            <StarIcon /> Burası Benim
          </h2>
          <Button variant="outline" size="sm" className="h-7 text-xs rounded-full border-[#eef3f0] text-slate-500">
            <Edit2 className="h-3 w-3 mr-1" /> Düzenle
          </Button>
        </div>

        <div className="relative mb-6">
          <Avatar className="h-32 w-32 border-4 border-[#f1eee8] shadow-sm">
            <AvatarImage src={student.avatar} />
            <AvatarFallback>{student.name[0]}</AvatarFallback>
          </Avatar>
          <button className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md border border-slate-100 text-slate-500 hover:text-[#6b8e7c]">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>

        <div className="w-full space-y-4 text-sm">
          <ProfileRow icon={Globe} label="Ülke" value="Kanada" flag="🇨🇦" />
          <ProfileRow icon={Gift} label="Doğum günüm" value="14 Mart 2009" />
          <ProfileRow icon={MessageIcon} label="Konuştuğum diller" value="İngilizce, Fransızca" />
          <ProfileRow icon={Heart} label="İlgi alanlarım" value="Müzik, kitaplar, seyahat, fotoğrafçılık" />
          <ProfileRow icon={Coffee} label="En sevdiğim şeyler" value="Kahve, kediler, deniz, iyi filmler" />
          <ProfileRow icon={Cat} label="Evcil hayvanım" value="Milo 🐱" />
        </div>
      </div>

      {/* AVATARINI SEÇ */}
      <div>
        <h3 className="font-bold text-[#2d4a3e] mb-3 text-sm">Avatarını seç</h3>
        <div className="flex items-center gap-3">
          {avatars.map((av, i) => (
            <Avatar key={i} className={`h-12 w-12 cursor-pointer transition-transform hover:scale-110 ${i===0 ? 'ring-2 ring-[#6b8e7c] ring-offset-2' : 'opacity-70'}`}>
              <AvatarImage src={av} />
            </Avatar>
          ))}
        </div>
      </div>

      {/* ARKA PLAN TEMASI */}
      <div>
        <h3 className="font-bold text-[#2d4a3e] mb-3 text-sm">Arka plan temasını seç</h3>
        <div className="flex gap-2">
          {['bg-[#e8f1ec]', 'bg-[#fdfaf6]', 'bg-[#1a2b3c]', 'bg-[#fff5f2]'].map((bg, i) => (
            <div key={i} className={`h-16 w-12 rounded-xl cursor-pointer shadow-sm border ${i===1 ? 'border-[#6b8e7c] ring-1 ring-[#6b8e7c]' : 'border-transparent'} ${bg} flex items-end justify-center pb-2 text-lg`}>
              {i===0 ? '🌿' : i===1 ? '🏛️' : i===2 ? '🌙' : '☕'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, flag }: { icon: any, label: string, value: string, flag?: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
      <Icon className="h-4 w-4 text-[#6b8e7c] mt-0.5" />
      <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
        <span className="text-slate-500 text-xs mt-0.5">{label}</span>
        <span className="font-medium text-[#2d4a3e] leading-snug">
          {flag && <span className="mr-1">{flag}</span>}
          {value}
        </span>
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
