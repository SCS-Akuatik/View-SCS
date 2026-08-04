import { supabaseClient } from '../src/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        return;
    }

    try {
        // 1. Tarik Judul Event
        const { data: eventData } = await supabaseClient.from('events').select('event_name').eq('id', currentEventId).single();
        if (eventData) {
            document.getElementById('eventName').innerText = eventData.event_name;
        }

        // 2. Tarik Data Formasi dari "KASTA TERTINGGI" (event_heats)
        const { data: heats, error } = await supabaseClient
            .from('event_heats')
            .select('*')
            .eq('event_id', currentEventId)
            .order('event_number', { ascending: true })
            .order('heat_number', { ascending: true });

        if (error) throw error;

        const container = document.getElementById('heatContainer');
        container.innerHTML = '';

        if (!heats || heats.length === 0) {
            container.innerHTML = `
            <div class="text-center p-10 border-2 border-dashed border-red-300 rounded-2xl bg-red-50">
                <h3 class="text-red-600 font-black text-lg">⚠️ Buku Acara Kosong!</h3>
                <p class="text-slate-600 text-sm mt-2">Anda belum meng-generate Start List. Harap masuk ke menu "Buku Acara (Start List)" lalu klik Simpan.</p>
            </div>`;
            return;
        }

        // 3. Kelompokkan berdasarkan Sesi
        const groupedBySesi = {};
        heats.forEach(heat => {
            const sesi = heat.sesi || 'SESI UTAMA';
            if (!groupedBySesi[sesi]) groupedBySesi[sesi] = [];
            groupedBySesi[sesi].push(heat);
        });

        // 4. Render ke Kertas A4
        Object.keys(groupedBySesi).forEach(sesiName => {
            
            // Header Sesi (Desain Tinta Hemat & Elegan)
            container.innerHTML += `
            <div class="border-y-[3px] border-slate-900 py-2 text-center font-black uppercase tracking-[0.3em] text-sm mb-6 mt-10">
                ${sesiName}
            </div>`;

            let html = '';
            groupedBySesi[sesiName].forEach(heat => {
                let tbodyHtml = '';
                
                // Pastikan urut sesuai lane
                heat.lanes_data.sort((a,b) => a.lane - b.lane);
                const maxLanes = heat.lanes_data.length;

                for (let i = 0; i < maxLanes; i++) {
                    const swimmer = heat.lanes_data[i];
                    if (swimmer && swimmer.f1_id && swimmer.nama) {
                        tbodyHtml += `
                        <tr class="border-b border-slate-300 text-xs text-slate-900">
                            <td class="py-1 px-2 text-center font-black">${swimmer.lane}</td>
                            <td class="py-1 px-2 font-bold tracking-tight">${swimmer.nama.toUpperCase()}</td>
                            <td class="py-1 px-2 font-semibold text-slate-600">${swimmer.klub}</td>
                            <td class="py-1 px-2 text-center font-mono font-bold text-slate-700">${swimmer.seed_time || 'NT'}</td>
                        </tr>`;
                    } else {
                        tbodyHtml += `
                        <tr class="border-b border-slate-200 text-xs text-slate-400">
                            <td class="py-1 px-2 text-center font-bold">${swimmer ? swimmer.lane : (i+1)}</td>
                            <td class="py-1 px-2 italic">--- Kosong ---</td>
                            <td class="py-1 px-2"></td>
                            <td class="py-1 px-2"></td>
                        </tr>`;
                    }
                }

                html += `
                <div class="print-break-inside-avoid mb-6">
                    <div class="flex justify-between items-end border-b-2 border-slate-800 pb-1 mb-1 mt-4">
                        <h3 class="font-black text-[11px] uppercase text-slate-900">EVENT #${heat.event_number}: ${heat.nomor_lomba} - ${heat.gender} - ${heat.kelompok_umur}</h3>
                        <span class="font-black text-[10px] text-slate-500 uppercase tracking-wider">HEAT ${heat.heat_number} of ${heat.total_heats}</span>
                    </div>
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-[9px] text-slate-500 uppercase tracking-widest border-b-[2px] border-slate-400">
                                <th class="py-1 px-2 w-10 text-center font-black">LINT</th>
                                <th class="py-1 px-2 font-black">NAMA ATLET</th>
                                <th class="py-1 px-2 font-black">KLUB / SEKOLAH</th>
                                <th class="py-1 px-2 w-24 text-center font-black">SEED TIME</th>
                            </tr>
                        </thead>
                        <tbody>${tbodyHtml}</tbody>
                    </table>
                </div>`;
            });
            container.innerHTML += html;
        });

    } catch (err) {
        alert("Gagal memuat dokumen: " + err.message);
    }
});
