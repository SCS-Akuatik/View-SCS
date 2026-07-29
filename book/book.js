import { supabaseClient } from '../src/supabase.js';

let LINTASAN_MAX = 8; // Default, akan ditimpa oleh URL parameter
let currentEventId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Ambil ID Event & Jumlah Lintasan dari URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');
    
    const lanesParam = urlParams.get('lanes');
    if (lanesParam) {
        LINTASAN_MAX = parseInt(lanesParam);
    }

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        return;
    }

    try {
        // 1. Ambil Nama Event
        const { data: eventData } = await supabaseClient.from('events').select('event_name').eq('id', currentEventId).single();
        if (eventData) document.getElementById('eventName').innerText = eventData.event_name;

        // 2. Ambil SEMUA data peserta yang SUDAH LUNAS (Filter aktif!)
        const { data: peserta, error } = await supabaseClient
            .from('event_registrations')
            .select('*')
            .eq('event_id', currentEventId)
            .eq('status_pembayaran', 'Lunas'); // Memastikan hanya yang Lunas yang masuk Heat

        if (error) throw error;

        // 3. JALANKAN ALGORITMA HEAT
        const heatData = generateHeatSheet(peserta || []);
        
        // 4. RENDER KE HTML
        renderHeatSheet(heatData);

    } catch (err) {
        console.error("Gagal generate Heat:", err);
        document.getElementById('heatContainer').innerHTML = `<p class="text-red-500 font-bold text-center">Gagal memproses data: ${err.message}</p>`;
    }
});

// ==========================================
// ALGORITMA CORE: GENERATE HEAT
// ==========================================
function generateHeatSheet(rawRegistrations) {
    let flattenedData = [];

    // TAHAP 1: FLATTENING (Mecah 1 anak yang ikut 3 nomor, jadi 3 data terpisah)
    rawRegistrations.forEach(atlet => {
        if (!Array.isArray(atlet.nomor_lomba)) return;
        
        atlet.nomor_lomba.forEach(nomor => {
            flattenedData.push({
                id_pendaftaran: atlet.id,
                nama: atlet.nama_peserta,
                klub: atlet.klub_asal,
                gender: atlet.gender,
                ku: atlet.kelompok_umur,
                nomor_lomba: nomor,
                seed_time: 'NT' // No Time (Belum ada waktu catatan)
            });
        });
    });

    // TAHAP 2: GROUPING (Kelompokkan berdasarkan: Nomor Lomba -> Gender -> KU)
    let grouped = {};

    flattenedData.forEach(item => {
        // Bikin kunci unik, misal: "Kicking Bebas 25m_Putra_KU Pemula"
        const key = `${item.nomor_lomba}_${item.gender}_${item.ku}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                title: `${item.nomor_lomba} - ${item.gender} - ${item.ku}`,
                swimmers: []
            };
        }
        grouped[key].swimmers.push(item);
    });

    // TAHAP 3: SEEDING / PEMBAGIAN HEAT
    let finalHeats = [];
    let absoluteEventNumber = 1; // Event 1, Event 2, dst...

    // Urutkan Keys biar jadwal acaranya berurutan rapi
    const sortedKeys = Object.keys(grouped).sort();

    sortedKeys.forEach(key => {
        const group = grouped[key];
        let swimmers = group.swimmers;

        // Sementara sort berdasarkan nama (Nanti di-upgrade pakai Seed Time)
        swimmers.sort((a, b) => a.nama.localeCompare(b.nama));

        // Pecah array per LINTASAN_MAX (sesuai pilihan panitia)
        let totalHeats = Math.ceil(swimmers.length / LINTASAN_MAX);
        
        let heatCounter = 1;
        for (let i = 0; i < swimmers.length; i += LINTASAN_MAX) {
            const chunk = swimmers.slice(i, i + LINTASAN_MAX);
            
            finalHeats.push({
                eventNumber: absoluteEventNumber,
                eventName: group.title,
                heatNumber: heatCounter,
                totalHeats: totalHeats,
                lanes: chunk
            });
            heatCounter++;
        }
        absoluteEventNumber++;
    });

    return finalHeats;
}

// ==========================================
// RENDER KE LAYAR PDF A4
// ==========================================
function renderHeatSheet(heatData) {
    const container = document.getElementById('heatContainer');
    container.innerHTML = '';

    if (heatData.length === 0) {
        container.innerHTML = `<p class="text-center font-bold text-slate-500">Belum ada data peserta untuk diurutkan.</p>`;
        return;
    }

    heatData.forEach(heat => {
        let tbodyHtml = '';
        
        // Loop lintasan 1 sampai max
        for (let lintasan = 1; lintasan <= LINTASAN_MAX; lintasan++) {
            // Index array dimulai dari 0
            const swimmer = heat.lanes[lintasan - 1]; 
            
            if (swimmer) {
                tbodyHtml += `
                <tr class="border-b border-slate-200 text-xs text-slate-800">
                    <td class="py-1.5 px-2 text-center font-bold">${lintasan}</td>
                    <td class="py-1.5 px-2 font-bold">${swimmer.nama.toUpperCase()}</td>
                    <td class="py-1.5 px-2 font-medium text-slate-600">${swimmer.klub}</td>
                    <td class="py-1.5 px-2 text-center font-mono text-slate-500">${swimmer.seed_time}</td>
                </tr>`;
            } else {
                // Lintasan Kosong
                tbodyHtml += `
                <tr class="border-b border-slate-200 text-xs text-slate-300">
                    <td class="py-1.5 px-2 text-center">${lintasan}</td>
                    <td class="py-1.5 px-2 italic">--- Kosong ---</td>
                    <td class="py-1.5 px-2"></td>
                    <td class="py-1.5 px-2"></td>
                </tr>`;
            }
        }

        const heatBlock = `
        <div class="break-inside-avoid mb-6 border border-slate-300 rounded-lg p-3 bg-white">
            <div class="flex justify-between items-end border-b border-slate-800 pb-2 mb-2">
                <div>
                    <h3 class="font-black text-sm uppercase text-slate-900">Event #${heat.eventNumber}: ${heat.eventName}</h3>
                </div>
                <div class="text-right">
                    <span class="bg-slate-800 text-white font-bold text-[10px] px-2 py-1 rounded">HEAT ${heat.heatNumber} of ${heat.totalHeats}</span>
                </div>
            </div>
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-300">
                        <th class="py-1 px-2 w-10 text-center font-bold">LINT</th>
                        <th class="py-1 px-2 font-bold">NAMA ATLET</th>
                        <th class="py-1 px-2 font-bold">KLUB / SEKOLAH</th>
                        <th class="py-1 px-2 w-20 text-center font-bold">SEED TIME</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbodyHtml}
                </tbody>
            </table>
        </div>`;

        container.innerHTML += heatBlock;
    });
}
