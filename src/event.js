import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const gridContainer = document.getElementById('eventGrid');
    
    if (!gridContainer) return;
    gridContainer.innerHTML = `<p class="text-center text-gray-500 col-span-full py-10 font-bold animate-pulse">Memuat data event seluruh Indonesia...</p>`;

    try {
        // Tarik semua event, urutkan dari yang terbaru (atau bebas)
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*')
            .order('event_date', { ascending: false });

        if (error) throw error;

        if (!events || events.length === 0) {
            gridContainer.innerHTML = `<div class="col-span-full text-center py-20"><p class="text-gray-500 font-bold text-lg mb-2">Belum ada event perlombaan terdaftar.</p><p class="text-sm text-gray-400">Jadilah yang pertama menyelenggarakan event dengan SCS!</p></div>`;
            return;
        }

        let html = '';
        events.forEach(ev => {
            // Logika sederhana: Jika tanggal sekarang melebihi end_date, dianggap SELESAI.
            // Jika hari ini berada di antara start - end, dianggap LIVE.
            // Selain itu (masih di masa depan), dianggap BUKA.
            const today = new Date();
            const startDate = new Date(ev.event_date);
            const endDate = new Date(ev.end_date);
            
            let badgeHTML = '';
            let btnHTML = '';
            let filterClass = ''; // Untuk filter button nanti

            if (today > endDate) {
                // Selesai
                badgeHTML = `<div class="absolute top-4 left-4 bg-gray-600 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm">SELESAI</div>`;
                btnHTML = `<a href="https://${ev.subdomain}.funswimming.my.id/result?id=${ev.id}" class="block text-center w-full border-2 border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition">Lihat Hasil Akhir</a>`;
                filterClass = 'selesai';
            } else if (today >= startDate && today <= endDate) {
                // Sedang Berjalan (LIVE)
                badgeHTML = `<div class="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE RESULT
                    </div>`;
                btnHTML = `<a href="https://${ev.subdomain}.funswimming.my.id/result?id=${ev.id}" class="block text-center w-full bg-red-50 text-red-700 font-bold py-2.5 rounded-xl hover:bg-red-100 transition">Pantau Hasil Pertandingan</a>`;
                filterClass = 'live';
            } else {
                // Masih Buka (Pendaftaran)
                badgeHTML = `<div class="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm">PENDAFTARAN DIBUKA</div>`;
                btnHTML = `<a href="https://${ev.subdomain}.funswimming.my.id?id=${ev.id}" class="block text-center w-full bg-blue-50 text-scsBlue font-bold py-2.5 rounded-xl hover:bg-blue-100 transition">Lihat Detail & Daftar</a>`;
                filterClass = 'buka';
            }

            // Fallback lokasi jika provinsi/kota kosong
            const lokasiText = (ev.kota && ev.provinsi) ? `${ev.kota}, ${ev.provinsi}` : 'Lokasi Belum Ditentukan';
            
            // Format Tanggal (Misal: 15 Agustus 2026) - Versi sederhana
            const dateText = (ev.event_date === ev.end_date) 
                ? ev.event_date 
                : `${ev.event_date} s/d ${ev.end_date}`;

            html += `
            <div class="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow border border-gray-100 group event-card ${filterClass}">
                <div class="h-48 overflow-hidden relative bg-blue-900 flex items-center justify-center">
                    <!-- Gunakan default image dari unsplash -->
                    <img src="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 mix-blend-overlay" alt="Event">
                    <h2 class="absolute text-white/20 font-black text-4xl uppercase tracking-tighter mix-blend-overlay pointer-events-none text-center px-4 leading-none">${ev.event_name}</h2>
                    ${badgeHTML}
                </div>
                <div class="p-6">
                    <p class="text-xs font-bold text-scsGold mb-1">📅 ${dateText}</p>
                    <h3 class="text-xl font-bold text-gray-900 mb-2 truncate" title="${ev.event_name}">${ev.event_name}</h3>
                    <p class="text-sm text-gray-500 mb-4 font-medium flex items-center gap-1.5"><span class="text-red-400">📍</span> ${lokasiText}</p>
                    ${btnHTML}
                </div>
            </div>
            `;
        });

        gridContainer.innerHTML = html;

    } catch (err) {
        console.error(err);
        gridContainer.innerHTML = `<p class="text-center text-red-500 col-span-full py-10 font-bold">Gagal memuat kalender: ${err.message}</p>`;
    }
});
