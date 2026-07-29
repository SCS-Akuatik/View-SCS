import { supabaseClient } from '../src/supabase.js';

let LINTASAN_MAX = 8; 
let currentEventId = null;
let allFlattenedData = []; 
let orderOfEvents = []; 

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');
    
    // MENERIMA BERAPAPUN JUMLAH LINTASAN DARI INPUTAN PANITIA
    const lanesParam = urlParams.get('lanes');
    if (lanesParam) {
        LINTASAN_MAX = parseInt(lanesParam);
        document.getElementById('infoLintasan').innerText = `${LINTASAN_MAX} Lintasan`;
    }

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        return;
    }

    try {
        const { data: eventData } = await supabaseClient.from('events').select('event_name').eq('id', currentEventId).single();
        if (eventData) document.getElementById('eventName').innerText = eventData.event_name;

        // Tarik data atlet Lunas
        const { data: peserta, error } = await supabaseClient
            .from('event_registrations')
            .select('*')
            .eq('event_id', currentEventId)
            .eq('status_pembayaran', 'Lunas');

        if (error) throw error;

        prepareData(peserta || []);

    } catch (err) {
        console.error(err);
        alert("Gagal memuat data: " + err.message);
    }
});

function prepareData(rawRegistrations) {
    let uniqueNomor = new Set();
    let uniqueKU = new Set();

    rawRegistrations.forEach(atlet => {
        if (!Array.isArray(atlet.nomor_lomba)) return;
        
        atlet.nomor_lomba.forEach(nomor => {
            uniqueNomor.add(nomor);
            uniqueKU.add(atlet.kelompok_umur);
            
            allFlattenedData.push({
                id_pendaftaran: atlet.id,
                nama: atlet.nama_peserta,
                klub: atlet.klub_asal,
                gender: atlet.gender,
                ku: atlet.kelompok_umur,
                nomor_lomba: nomor,
                seed_time: 'NT' 
            });
        });
    });

    const selectNomor = document.getElementById('buildNomor');
    const selectKU = document.getElementById('buildKU');
    
    Array.from(uniqueNomor).sort().forEach(n => {
        selectNomor.innerHTML += `<option value="${n}">${n}</option>`;
    });
    
    Array.from(uniqueKU).sort().forEach(ku => {
        selectKU.innerHTML += `<option value="${ku}">${ku}</option>`;
    });
}

// ==========================================
// LOGIKA BUILDER (Menambahkan Event)
// ==========================================
window.tambahkanEventLomba = function() {
    const sesi = document.getElementById('buildSesi').value;
    const nomor = document.getElementById('buildNomor').value;
    const ku = document.getElementById('buildKU').value;
    const gender = document.getElementById('buildGender').value;

    orderOfEvents.push({
        id: Date.now(), 
        sesi: sesi,
        nomor: nomor,
        ku: ku,
        gender: gender
    });

    renderSidebarList();
    renderKertasA4();
}

window.hapusEventLomba = function(id) {
    orderOfEvents = orderOfEvents.filter(ev => ev.id !== id);
    renderSidebarList();
    renderKertasA4();
}

function renderSidebarList() {
    const listContainer = document.getElementById('listOrderEvents');
    listContainer.innerHTML = '';

    if(orderOfEvents.length === 0) {
        listContainer.innerHTML = `<li class="text-xs text-slate-400 text-center italic mt-10">Belum ada acara ditambahkan.</li>`;
        return;
    }

    orderOfEvents.forEach((ev, index) => {
        listContainer.innerHTML += `
        <li class="bg-white p-2.5 rounded border border-slate-200 shadow-sm flex justify-between items-center group">
            <div>
                <p class="text-[10px] font-black text-slate-800">#${index + 1}: ${ev.nomor}</p>
                <p class="text-[9px] text-slate-500 font-bold">${ev.ku} • ${ev.gender} • <span class="text-blue-600">${ev.sesi}</span></p>
            </div>
            <button onclick="hapusEventLomba(${ev.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </li>`;
    });
}

// ==========================================
// ALGORITMA DEWA: FINA SEEDING (Distribusi Kekosongan)
// ==========================================
function calculateFinaHeats(totalPeserta, jumlahLintasan) {
    if (totalPeserta === 0) return [];
    
    let totalHeats = Math.ceil(totalPeserta / jumlahLintasan);
    let heats = Array(totalHeats).fill(jumlahLintasan);
    let shortfall = (totalHeats * jumlahLintasan) - totalPeserta;
    
    let limitBagi = Math.min(totalHeats, 2); 
    let i = 0;
    while (shortfall > 0) {
        heats[i % limitBagi]--; 
        shortfall--;
        i++;
    }
    
    return heats; 
}

// ==========================================
// ALGORITMA SPEARHEADING (Pengisian dari Tengah)
// ==========================================
function generateSpearheadPattern(lanes) {
    let pattern = [];
    let start = Math.floor((lanes + 1) / 2); // Cari titik tengah
    let toggle = true;
    let l = start;
    let r = start + 1;
    
    pattern.push(start);
    for(let i = 1; i < lanes; i++) {
        if(toggle && r <= lanes) {
            pattern.push(r);
            r++;
        } else if (!toggle && l - 1 >= 1) {
            l--;
            pattern.push(l);
        } else {
             if(r <= lanes) { pattern.push(r); r++; }
             else { l--; pattern.push(l); }
        }
        toggle = !toggle;
    }
    // Hasil pola misal untuk 5 lintasan: [3, 4, 2, 5, 1]
    return pattern;
}

// ==========================================
// RENDER DATA KE KERTAS A4
// ==========================================
function renderKertasA4() {
    const container = document.getElementById('heatContainer');
    container.innerHTML = '';

    if (orderOfEvents.length === 0) {
        container.innerHTML = `
        <div class="text-center p-10 text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-xl">
            👈 Gunakan Panel Builder di sebelah kiri untuk menyusun Buku Acara.
        </div>`;
        return;
    }

    // Pola posisi lintasan (Spearheading)
    let spearheadPattern = generateSpearheadPattern(LINTASAN_MAX);

    let groupedBySesi = {};
    orderOfEvents.forEach((ev, index) => {
        if (!groupedBySesi[ev.sesi]) groupedBySesi[ev.sesi] = [];
        groupedBySesi[ev.sesi].push({ ...ev, eventNumber: index + 1 });
    });

    Object.keys(groupedBySesi).forEach(namaSesi => {
        container.innerHTML += `
        <div class="bg-slate-800 text-white p-2 text-center font-black uppercase tracking-widest text-sm mb-4 mt-8 print:mt-4 rounded-md print:rounded-none">
            --- ${namaSesi} ---
        </div>`;

        groupedBySesi[namaSesi].forEach(ev => {
            let swimmers = allFlattenedData.filter(s => 
                s.nomor_lomba === ev.nomor && 
                s.ku === ev.ku && 
                s.gender === ev.gender
            );

            swimmers.sort((a, b) => a.nama.localeCompare(b.nama));

            if (swimmers.length === 0) {
                container.innerHTML += `<div class="mb-6 text-sm text-red-500 font-bold italic">Event #${ev.eventNumber}: ${ev.nomor} - ${ev.gender} - ${ev.ku} (Tidak ada peserta)</div>`;
                return;
            }

            let heatDistribution = calculateFinaHeats(swimmers.length, LINTASAN_MAX);
            let heatHtml = '';
            let swimmerIndex = 0;

            heatDistribution.forEach((jumlahOrangDalamHeat, heatIdx) => {
                let heatNumber = heatIdx + 1;
                let totalHeats = heatDistribution.length;
                let tbodyHtml = '';

                // Mapping perenang ke lintasan tengah (Spearheading)
                let assignedLanes = {};
                for (let k = 0; k < jumlahOrangDalamHeat; k++) {
                    let targetLane = spearheadPattern[k];
                    if (swimmers[swimmerIndex]) {
                        assignedLanes[targetLane] = swimmers[swimmerIndex];
                    }
                    swimmerIndex++;
                }

                // Loop Cetak Baris Tabel Berdasarkan Urutan Lintasan Asli (1,2,3,4..)
                for (let lintasan = 1; lintasan <= LINTASAN_MAX; lintasan++) {
                    if (assignedLanes[lintasan]) {
                        const swimmer = assignedLanes[lintasan];
                        tbodyHtml += `
                        <tr class="border-b border-slate-200 text-xs text-slate-800">
                            <td class="py-1 px-2 text-center font-bold">${lintasan}</td>
                            <td class="py-1 px-2 font-bold">${swimmer.nama.toUpperCase()}</td>
                            <td class="py-1 px-2 font-medium text-slate-600">${swimmer.klub}</td>
                            <td class="py-1 px-2 text-center font-mono text-slate-500">${swimmer.seed_time}</td>
                        </tr>`;
                    } else {
                        tbodyHtml += `
                        <tr class="border-b border-slate-200 text-xs text-slate-300">
                            <td class="py-1 px-2 text-center">${lintasan}</td>
                            <td class="py-1 px-2 italic">--- Kosong ---</td>
                            <td class="py-1 px-2"></td>
                            <td class="py-1 px-2"></td>
                        </tr>`;
                    }
                }

                heatHtml += `
                <div class="break-inside-avoid mb-4">
                    <div class="flex justify-between items-end border-b-2 border-slate-700 pb-1 mb-1 mt-3">
                        <h3 class="font-extrabold text-[11px] uppercase text-slate-900">Event #${ev.eventNumber}: ${ev.nomor} - ${ev.gender} - ${ev.ku}</h3>
                        <span class="font-bold text-[10px] text-slate-600 uppercase">HEAT ${heatNumber} of ${totalHeats}</span>
                    </div>
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                <th class="py-1 px-2 w-10 text-center font-bold">LINT</th>
                                <th class="py-1 px-2 font-bold">NAMA ATLET</th>
                                <th class="py-1 px-2 font-bold">KLUB / SEKOLAH</th>
                                <th class="py-1 px-2 w-20 text-center font-bold">SEED TIME</th>
                            </tr>
                        </thead>
                        <tbody>${tbodyHtml}</tbody>
                    </table>
                </div>`;
            });

            container.innerHTML += heatHtml;
        });
    });
}
