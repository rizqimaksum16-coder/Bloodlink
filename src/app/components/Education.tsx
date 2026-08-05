import React from 'react';
import { BookOpen, HeartPulse, Activity, Coffee, Info, ChevronRight } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Education() {
  usePageTitle('Edukasi Kesehatan');

  const articles = [
    {
      id: 1,
      title: 'Persiapan Sebelum Donor Darah',
      category: 'Persiapan',
      icon: Coffee,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      content: [
        'Tidur yang cukup minimal 5 jam sebelum mendonorkan darah.',
        'Makan makanan yang bergizi setidaknya 3-4 jam sebelum donor.',
        'Minum lebih banyak air putih untuk menjaga hidrasi tubuh.',
        'Hindari konsumsi alkohol dan obat-obatan tertentu (seperti aspirin) selama 48 jam terakhir.'
      ]
    },
    {
      id: 2,
      title: 'Pemulihan Setelah Donor',
      category: 'Pemulihan',
      icon: HeartPulse,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      content: [
        'Istirahat selama 10-15 menit di lokasi donor sambil menikmati snack/minuman yang disediakan.',
        'Hindari aktivitas fisik berat atau mengangkat beban berat dengan lengan donor selama 12 jam.',
        'Perbanyak minum air putih untuk menggantikan volume darah yang berkurang.',
        'Jika terasa pusing, berbaringlah dengan posisi kaki lebih tinggi dari kepala.'
      ]
    },
    {
      id: 3,
      title: 'Syarat Umum Menjadi Pendonor',
      category: 'Informasi',
      icon: Activity,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      content: [
        'Berusia antara 17 hingga 65 tahun.',
        'Berat badan minimal 45 kilogram.',
        'Tekanan darah sistolik 100-170 mmHg dan diastolik 70-100 mmHg.',
        'Kadar hemoglobin (Hb) minimal 12,5 g/dL.',
        'Tidak sedang sakit demam, flu, atau infeksi lainnya.'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C0392B] to-[#922B21] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <BookOpen className="w-64 h-64 -mr-16 -mt-16" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="bg-white/20 inline-flex p-3 rounded-xl mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pusat Edukasi Kesehatan</h1>
            <p className="text-white/80 text-sm">
              Panduan lengkap persiapan, pemulihan, dan informasi penting seputar donor darah untuk memastikan pengalaman donor yang aman dan bermanfaat.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#C0392B]" /> Fakta Menarik
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-800 font-medium leading-relaxed">
                    Satu kantong darah yang Anda donorkan dapat menyelamatkan hingga 3 nyawa!
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    Donor darah secara rutin dapat membantu menurunkan risiko penyakit jantung.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            {articles.map((article) => {
              const Icon = article.icon;
              return (
                <div key={article.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`${article.bgColor} p-3 rounded-xl flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${article.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${article.bgColor} ${article.color}`}>
                          {article.category}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 mb-3">{article.title}</h2>
                      <ul className="space-y-3">
                        {article.content.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-0.5 ${article.color}`} />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
