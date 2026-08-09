import { supabaseClient } from '../src/supabase.js';

let LINTASAN_MAX = 10; // <-- UDAH JADI 10 LINTASAN
let currentEventId = null;
let allFlattenedData = []; 
let orderOfEvents = []; 

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');
    
    const lanesParam = urlParams.get('lanes');
    if (lanesParam) {
        LINTASAN_MAX = parseInt(lanesParam);
        document.getElementById('infoLintasan').innerText = `${LINTASAN_MAX} Lintasan`;
    } else {
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
            let namaLomba = "";
            let waktuSeed = 'NT';

            if (typeof nomor === 'object' && nomor !== null) {
                namaLomba = nomor.gaya;
                waktuSeed = nomor.seed_time || 'NT';
            } else {
                namaLomba = nomor;
            }

            uniqueNomor.add(namaLomba);
            uniqueKU.add(atlet.kelompok_umur);
            
            allFlattenedData.push({
                id_pendaftaran: atlet.id,
                f1_id: atlet.f1_id, 
                nama: atlet.nama_peserta,
                klub: atlet.klub_asal,
                gender: atlet.gender,
                ku: atlet.kelompok_umur,
                nomor_lomba: namaLomba,
                seed_time: waktuSeed 
            });
        });
    });

    const selectNomor = document.getElementById('buildNomor');
    const selectKU = document.getElementById('buildKU');
    
    selectNomor.innerHTML = '';
    selectKU.innerHTML = '';
    
    Array.from(uniqueNomor).sort().forEach(n => {
        selectNomor.innerHTML += `<option value="${n}">${n}</option>`;
    });
    
    Array.from(uniqueKU).sort().forEach(ku => {
        selectKU.innerHTML += `<option value="${ku}">${ku}</option>`;
    });
}

// ==========================================
// FITUR BARU: LOAD DATA TERSIMPAN (UX POIN 2)
// ==========================================
window.loadUrutanTersimpan = async function() {
    try {
        const btn = document.getElementById('btnLoadDB');
        btn.innerHTML = "Memuat... ⏳";
        
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('sesi, event_number, nomor_lomba, kelompok_umur, gender')
            .eq('event_id', currentEventId)
            .order('event_number', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) {
            btn.innerHTML = "📥 Load Data Tersimpan";
            return alert("Belum ada jadwal yang tersimpan di database.");
        }

        if (orderOfEvents.length > 0) {
            if (!confirm("Peringatan: Me-load data tersimpan akan menimpa susunan di layar saat ini. Lanjutkan?")) {
                btn.innerHTML = "📥 Load Data Tersimpan";
                return;
            }
        }

        // Ekstrak event_number yang unik untuk merekonstruksi urutan
        let uniqueEvents = [];
        let seen = new Set();
        data.forEach(row => {
            if (!seen.has(row.event_number)) {
                seen.add(row.event_number);
                uniqueEvents.push(row);
            }
        });

        orderOfEvents = uniqueEvents.map(row => ({
            id: Date.now() + row.event_number,
            sesi: row.sesi,
            nomor: row.nomor_lomba,
            ku: row.kelompok_umur,
            gender: row.gender
        }));

        renderSidebarList();
        renderKertasA4();
        
        btn.innerHTML = "📥 Load Data Tersimpan";
    } catch (err) {
        alert("Gagal memuat data tersimpan: " + err.message);
        document.getElementById('btnLoadDB').innerHTML = "📥 Load Data Tersimpan";
    }
};

// ==========================================
// FITUR BARU: AUTO-GENERATE & ANTI BACK-TO-BACK (UX POIN 3)
// ==========================================
window.autoGenerateSemua = function() {
    if (allFlattenedData.length === 0) return alert("Belum ada data pendaftar untuk event ini.");
    if (orderOfEvents.length > 0) {
        if (!confirm("Susunan acara saat ini akan ditimpa. Lanjutkan?")) return;
    }

    orderOfEvents = []; 
    let comboSet = new Set();
    let uniqueCombos = [];

    // Cari kombinasi unik yang ADA PESERTANYA
    allFlattenedData.forEach(s => {
        let key = `${s.nomor_lomba}|${s.gender}|${s.ku}`;
        if (!comboSet.has(key)) {
            comboSet.add(key);
            uniqueCombos.push({
                nomor: s.nomor_lomba,
                gender: s.gender,
                ku: s.ku
            });
        }
    });

    // PENGURUTAN LOGIS UNTUK MENCEGAH BACK-TO-BACK:
    // 1. Gaya Lomba -> 2. Gender -> 3. Kelompok Umur
    uniqueCombos.sort((a, b) => {
        if (a.nomor !== b.nomor) return a.nomor.localeCompare(b.nomor);
        if (a.gender !== b.gender) return a.gender.localeCompare(b.gender); // Putra duluan
        return a.ku.localeCompare(b.ku);
    });

    uniqueCombos.forEach((c, idx) => {
        orderOfEvents.push({
            id: Date.now() + idx,
            sesi: 'Sesi Pagi', 
            nomor: c.nomor,
            ku: c.ku,
            gender: c.gender
        });
    });

    renderSidebarList();
    renderKertasA4();
};

window.kosongkanSemuaAcara = function() {
    if(!confirm("Yakin ingin mereset seluruh daftar acara?")) return;
    orderOfEvents = [];
    renderSidebarList();
    renderKertasA4();
};


// ==========================================
// LOGIKA BUILDER MANUAL & CEGAH DUPLIKAT (UX POIN 1)
// ==========================================
window.tambahkanEventLomba = function() {
    const sesi = document.getElementById('buildSesi').value;
    const nomor = document.getElementById('buildNomor').value;
    const ku = document.getElementById('buildKU').value;
    const gender = document.getElementById('buildGender').value;

    // CEGAH DUPLIKAT: Cek apakah lomba ini sudah ada di daftar
    const isDuplicate = orderOfEvents.some(ev => ev.nomor === nomor && ev.ku === ku && ev.gender === gender);
    if (isDuplicate) {
        return alert(`Kombinasi Lomba ini (${nomor}, ${gender}, ${ku}) sudah ditambahkan ke daftar!`);
    }

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

// UDAH PAKE DESAIN COMPACT LIST YANG BARU
function renderSidebarList() {
    const listContainer = document.getElementById('listOrderEvents');
    listContainer.innerHTML = '';

    if(orderOfEvents.length === 0) {
        listContainer.innerHTML = `<li class="text-xs text-slate-400 text-center italic mt-10">Belum ada acara ditambahkan.</li>`;
        return;
    }

    orderOfEvents.forEach((ev, index) => {
        listContainer.innerHTML += `
        <li class="bg-white px-3 py-2 border-b border-slate-100 hover:bg-slate-50 flex justify-between items-center group">
            <div class="flex items-center gap-3">
                <span class="text-[10px] font-mono text-slate-400 w-4">${index + 1}.</span>
                <div>
                    <p class="text-[11px] font-bold text-slate-800 leading-none mb-1">${ev.nomor}</p>
                    <p class="text-[9px] text-slate-500 font-medium">${ev.ku} • ${ev.gender} • <span class="text-blue-600">${ev.sesi}</span></p>
                </div>
            </div>
            <button onclick="hapusEventLomba(${ev.id})" class="text-slate-300 hover:text-red-500 transition-colors p-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
    let start = Math.floor((lanes + 1) / 2); 
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
    return pattern;
}

// ==========================================
// RENDER DATA KE KERTAS (CETAK PDF PRESISI TINGGI)
// ==========================================
function renderKertasA4() {
    const container = document.getElementById('heatContainer');
    container.innerHTML = '';

    if (orderOfEvents.length === 0) {
        container.innerHTML = `
        <div class="text-center p-10 text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-xl print-hidden">
            👈 Gunakan Panel Builder di sebelah kiri untuk menyusun Buku Acara.
        </div>`;
        return;
    }

    let spearheadPattern = generateSpearheadPattern(LINTASAN_MAX);

    let groupedBySesi = {};
    orderOfEvents.forEach((ev, index) => {
        if (!groupedBySesi[ev.sesi]) groupedBySesi[ev.sesi] = [];
        groupedBySesi[ev.sesi].push({ ...ev, eventNumber: index + 1 });
    });

    Object.keys(groupedBySesi).forEach(namaSesi => {
        container.innerHTML += `
        <div class="bg-black text-white p-2 text-center font-black uppercase tracking-widest text-[11px] mb-4 mt-8 print:mt-4">
            --- ${namaSesi} ---
        </div>`;

        groupedBySesi[namaSesi].forEach(ev => {
            let swimmers = allFlattenedData.filter(s => 
                s.nomor_lomba === ev.nomor && 
                s.ku === ev.ku && 
                s.gender === ev.gender
            );

            // LOGIKA 1: NT Paling Lambat
            swimmers.sort((a, b) => {
                if (a.seed_time === 'NT' && b.seed_time === 'NT') return a.nama.localeCompare(b.nama);
                if (a.seed_time === 'NT') return -1; 
                if (b.seed_time === 'NT') return 1;
                return b.seed_time.localeCompare(a.seed_time); 
            });

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

                let heatSwimmers = swimmers.slice(swimmerIndex, swimmerIndex + jumlahOrangDalamHeat);
                swimmerIndex += jumlahOrangDalamHeat;

                // LOGIKA 2: Dalam Heat, Tercepat di tengah (Spearheading)
                heatSwimmers.sort((a, b) => {
                    if (a.seed_time === 'NT' && b.seed_time === 'NT') return a.nama.localeCompare(b.nama);
                    if (a.seed_time === 'NT') return 1; 
                    if (b.seed_time === 'NT') return -1;
                    return a.seed_time.localeCompare(b.seed_time); 
                });

                let assignedLanes = {};
                for (let k = 0; k < jumlahOrangDalamHeat; k++) {
                    let targetLane = spearheadPattern[k];
                    assignedLanes[targetLane] = heatSwimmers[k];
                }

                // TABLE ROWS DIBIKIN TEGAS BORDERNYA BIAR PRESISI SAAT DI PRINT
                for (let lintasan = 1; lintasan <= LINTASAN_MAX; lintasan++) {
                    if (assignedLanes[lintasan]) {
                        const swimmer = assignedLanes[lintasan];
                        tbodyHtml += `
                        <tr class="text-[11px] text-black">
                            <td class="py-1 px-2 text-center font-bold border border-black">${lintasan}</td>
                            <td class="py-1 px-2 font-bold border border-black">${swimmer.nama.toUpperCase()}</td>
                            <td class="py-1 px-2 font-medium border border-black uppercase">${swimmer.klub}</td>
                            <td class="py-1 px-2 text-center font-mono border border-black">${swimmer.seed_time}</td>
                        </tr>`;
                    } else {
                        tbodyHtml += `
                        <tr class="text-[11px] text-gray-500">
                            <td class="py-1 px-2 text-center border border-black">${lintasan}</td>
                            <td class="py-1 px-2 italic border border-black"></td>
                            <td class="py-1 px-2 border border-black"></td>
                            <td class="py-1 px-2 border border-black"></td>
                        </tr>`;
                    }
                }

                // KELAS avoid-break MEMASTIKAN TABEL TIDAK TERBELAH DUA DI KERTAS
                heatHtml += `
                <div class="avoid-break mb-4 mt-4">
                    <div class="flex justify-between items-end pb-1 mb-1">
                        <h3 class="font-black text-[12px] uppercase text-black">Event #${ev.eventNumber}: ${ev.nomor} - ${ev.gender} - ${ev.ku}</h3>
                        <span class="font-bold text-[10px] text-black uppercase border border-black px-2 py-0.5 bg-gray-100">HEAT ${heatNumber} / ${totalHeats}</span>
                    </div>
                    <table class="w-full text-left border-collapse border border-black">
                        <thead class="bg-gray-100 print:bg-gray-100">
                            <tr class="text-[10px] text-black uppercase tracking-widest">
                                <th class="py-1.5 px-2 w-10 text-center font-black border border-black">LINT</th>
                                <th class="py-1.5 px-2 font-black border border-black">NAMA ATLET</th>
                                <th class="py-1.5 px-2 font-black border border-black w-2/5">KLUB / SEKOLAH</th>
                                <th class="py-1.5 px-2 w-20 text-center font-black border border-black">SEED TIME</th>
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

// ==========================================
// SIMPAN KE DATABASE (Tabel: event_heats)
// ==========================================
window.simpanKeDatabase = async function() {
    if (orderOfEvents.length === 0) {
        return alert("Belum ada acara yang ditambahkan ke Buku Acara!");
    }

    const btnSimpan = document.getElementById('btnSimpanBuku');
    btnSimpan.innerText = "Menyimpan... ⏳";
    btnSimpan.disabled = true;

    try {
        await supabaseClient.from('event_heats').delete().eq('event_id', currentEventId);

        let dataToInsert = [];
        let spearheadPattern = generateSpearheadPattern(LINTASAN_MAX);

        orderOfEvents.forEach((ev, index) => {
            let eventNumber = index + 1;
            
            let swimmers = allFlattenedData.filter(s => 
                s.nomor_lomba === ev.nomor && 
                s.ku === ev.ku && 
                s.gender === ev.gender
            );

            swimmers.sort((a, b) => {
                if (a.seed_time === 'NT' && b.seed_time === 'NT') return a.nama.localeCompare(b.nama);
                if (a.seed_time === 'NT') return -1;
                if (b.seed_time === 'NT') return 1;
                return b.seed_time.localeCompare(a.seed_time); 
            });

            if (swimmers.length === 0) return;

            let heatDistribution = calculateFinaHeats(swimmers.length, LINTASAN_MAX);
            let swimmerIndex = 0;

            heatDistribution.forEach((jumlahOrang, heatIdx) => {
                let heatNumber = heatIdx + 1;
                let lanesDataArray = [];

                let heatSwimmers = swimmers.slice(swimmerIndex, swimmerIndex + jumlahOrang);
                swimmerIndex += jumlahOrang;

                heatSwimmers.sort((a, b) => {
                    if (a.seed_time === 'NT' && b.seed_time === 'NT') return a.nama.localeCompare(b.nama);
                    if (a.seed_time === 'NT') return 1;
                    if (b.seed_time === 'NT') return -1;
                    return a.seed_time.localeCompare(b.seed_time); 
                });

                let assignedLanes = {};
                for (let k = 0; k < jumlahOrang; k++) {
                    let targetLane = spearheadPattern[k];
                    assignedLanes[targetLane] = heatSwimmers[k];
                }

                for (let lintasan = 1; lintasan <= LINTASAN_MAX; lintasan++) {
                    if (assignedLanes[lintasan]) {
                        const atlet = assignedLanes[lintasan];
                        lanesDataArray.push({
                            lane: lintasan,
                            f1_id: atlet.f1_id,
                            id_pendaftaran: atlet.id_pendaftaran,
                            nama: atlet.nama,
                            klub: atlet.klub,
                            seed_time: atlet.seed_time
                        });
                    } else {
                        lanesDataArray.push({
                            lane: lintasan,
                            nama: null
                        });
                    }
                }

                dataToInsert.push({
                    event_id: currentEventId,
                    sesi: ev.sesi,
                    event_number: eventNumber,
                    nomor_lomba: ev.nomor,
                    kelompok_umur: ev.ku,
                    gender: ev.gender,
                    heat_number: heatNumber,
                    total_heats: heatDistribution.length,
                    lanes_data: lanesDataArray
                });
            });
        });

        const { error: insertErr } = await supabaseClient.from('event_heats').insert(dataToInsert);
        if (insertErr) throw insertErr;

        alert("✅ Start List berhasil dikunci dan disimpan ke Database! Lanjutkan ke Heat Builder jika ada perubahan lintasan lapangan.");

    } catch (err) {
        console.error("Gagal simpan:", err);
        alert("Gagal menyimpan ke database: " + err.message);
    } finally {
        btnSimpan.innerText = "💾 Kunci Start List";
        btnSimpan.disabled = false;
    }
}

