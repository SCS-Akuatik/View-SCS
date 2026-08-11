import { supabaseClient } from '../src/supabase.js';

let LINTASAN_MAX = 10; 
let currentEventId = null;
let allFlattenedData = []; 
let orderOfEvents = []; 

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');
    
    const lanesParam = urlParams.get('lanes');
    if (lanesParam) {
        LINTASAN_MAX = parseInt(lanesParam);
    }
    document.getElementById('infoLintasan').innerText = `${LINTASAN_MAX} Lintasan`;

    if (!currentEventId) {
        alert("ID Event tidak ditemukan!");
        return;
    }

    try {
        // Ambil Data Event (Nama, Tanggal, Lokasi)
        const { data: eventData } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', currentEventId)
            .single();

        if (eventData) {
            // 1. DYNAMIC BINDING: Judul Event
            document.getElementById('coverTitle').innerText = eventData.event_name || 'EVENT TANPA NAMA';
            document.getElementById('contentTitle').innerText = eventData.event_name || 'EVENT TANPA NAMA';
            
            // 2. DYNAMIC BINDING & FORMATTER: Tanggal Event (Indonesian Locale)
            let formattedDate = 'Jadwal belum dikonfirmasi';
            // Antisipasi nama kolom di DB (start_date / event_date / tanggal)
            const rawDate = eventData.start_date || eventData.event_date || eventData.tanggal; 
            
            if (rawDate) {
                try {
                    const dateObj = new Date(rawDate);
                    // Pastikan format tanggal valid
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toLocaleDateString('id-ID', {
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric'
                        });
                    }
                } catch (e) {
                    console.error("Gagal memformat tanggal:", e);
                }
            }
            document.getElementById('coverDate').innerText = formattedDate;
            
            // 3. FIX DYNAMIC BINDING: Lokasi Event dengan Fallback (Nyontek dari event-public)
            const config = eventData.config || {};
            const namaKota = eventData.kota || '';
            const namaProvinsi = eventData.provinsi || '';
            const namaKolam = config.nama_kolam || '';
            
            let teksLokasiLengkap = '';
            if (namaKolam) teksLokasiLengkap += `${namaKolam} - `;
            if (namaKota && namaProvinsi) {
                teksLokasiLengkap += `${namaKota}, ${namaProvinsi}`;
            } else if (namaKota || namaProvinsi) {
                teksLokasiLengkap += `${namaKota}${namaProvinsi}`;
            }

            document.getElementById('coverLocation').innerText = teksLokasiLengkap || 'Lokasi belum dikonfirmasi';

            
            // 4. Render Sponsor VIP di Cover
            await renderCoverSponsors();
        }

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

// ==========================================
// RENDER SPONSOR VIP DI HALAMAN COVER (THE GRAND ENTRANCE)
// ==========================================
async function renderCoverSponsors() {
    try {
        const { data: linkData } = await supabaseClient
            .from('event_sponsors')
            .select('sponsor_ids')
            .eq('event_id', currentEventId)
            .single();

        const coverSponsorDiv = document.getElementById('coverSponsors');

        if (!linkData || !linkData.sponsor_ids || linkData.sponsor_ids.length === 0) {
            coverSponsorDiv.innerHTML = `<span class="text-xs text-slate-300 font-bold italic">Tanpa Dukungan Sponsor</span>`;
            return;
        }

        const { data: sponsors } = await supabaseClient
            .from('master_sponsors')
            .select('*')
            .in('id', linkData.sponsor_ids);

        if (!sponsors || sponsors.length === 0) {
            coverSponsorDiv.innerHTML = `<span class="text-xs text-slate-300 font-bold italic">Tanpa Dukungan Sponsor</span>`;
            return;
        }

        // AMBIL MAKSIMAL 3 SPONSOR UTAMA (Sesuai Arahan Bos)
        const platinumSponsors = sponsors.slice(0, 3);
        let spHtml = '';

        platinumSponsors.forEach(sp => {
            spHtml += `
                <img src="${sp.logo_url}" 
                     alt="${sp.sponsor_name}" 
                     class="transition-transform hover:scale-105"
                     onerror="this.onerror=null; this.outerHTML='<div class=\\'bg-white border border-slate-200 px-4 py-2 rounded shadow-sm text-sm font-black text-slate-400 uppercase\\'>${sp.sponsor_name}</div>';">
            `;
        });

        coverSponsorDiv.innerHTML = spHtml;
    } catch (err) {
        console.error("Gagal merender sponsor cover:", err);
    }
}

// ==========================================
// CORE FUNGSI (TIDAK ADA YANG DIUBAH)
// ==========================================
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

window.autoGenerateSemua = function() {
    if (allFlattenedData.length === 0) return alert("Belum ada data pendaftar untuk event ini.");
    if (orderOfEvents.length > 0) {
        if (!confirm("Susunan acara saat ini akan ditimpa. Lanjutkan?")) return;
    }

    orderOfEvents = []; 
    let comboSet = new Set();
    let uniqueCombos = [];

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

    uniqueCombos.sort((a, b) => {
        if (a.nomor !== b.nomor) return a.nomor.localeCompare(b.nomor);
        if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
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

window.tambahkanEventLomba = function() {
    const sesi = document.getElementById('buildSesi').value;
    const nomor = document.getElementById('buildNomor').value;
    const ku = document.getElementById('buildKU').value;
    const gender = document.getElementById('buildGender').value;

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

function renderSidebarList() {
    const listContainer = document.getElementById('listOrderEvents');
    listContainer.innerHTML = '';

    if(orderOfEvents.length === 0) {
        listContainer.innerHTML = `<li class="text-xs text-slate-400 text-center italic mt-10">Belum ada acara ditambahkan.</li>`;
        return;
    }

    orderOfEvents.forEach((ev, index) => {
        listContainer.innerHTML += `
        <li class="bg-white p-3 border border-slate-200 hover:bg-slate-50 hover:border-blue-200 flex justify-between items-center group mb-2 shadow-sm rounded-xl mx-1 transition-all">
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                    <span class="text-[10px] font-black">${index + 1}</span>
                </div>
                <div class="truncate">
                    <p class="text-xs font-black text-slate-800 leading-none mb-1 truncate">${ev.nomor}</p>
                    <p class="text-[10px] text-slate-500 font-bold truncate">${ev.ku} • ${ev.gender}</p>
                </div>
            </div>
            
            <button onclick="hapusEventLomba(${ev.id})" class="text-slate-400 hover:text-red-600 transition-colors p-2 shrink-0 bg-slate-50 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 ml-2 shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </li>`;
    });
}

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
        <div class="bg-slate-800 text-white p-2 text-center font-black uppercase tracking-widest text-sm mb-4 mt-8 print:mt-4 rounded-md print:rounded-none">
            --- ${namaSesi} ---
        </div>`;

        groupedBySesi[namaSesi].forEach(ev => {
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

                for (let lintasan = 1; lintasan <= LINTASAN_MAX; lintasan++) {
                    if (assignedLanes[lintasan]) {
                        const swimmer = assignedLanes[lintasan];
                        tbodyHtml += `
                        <tr class="border-b border-slate-200 text-xs text-slate-800">
                            <td class="py-1.5 px-2 text-center font-bold">${lintasan}</td>
                            <td class="py-1.5 px-2 font-bold truncate max-w-0" title="${swimmer.nama.toUpperCase()}">${swimmer.nama.toUpperCase()}</td>
                            <td class="py-1.5 px-2 font-medium text-slate-600 truncate max-w-0 uppercase" title="${swimmer.klub}">${swimmer.klub}</td>
                            <td class="py-1.5 px-2 text-center font-mono text-slate-500">${swimmer.seed_time}</td>
                        </tr>`;
                    } else {
                        tbodyHtml += `
                        <tr class="border-b border-slate-200 text-xs text-slate-300">
                            <td class="py-1.5 px-2 text-center">${lintasan}</td>
                            <td class="py-1.5 px-2 italic truncate max-w-0">--- Kosong ---</td>
                            <td class="py-1.5 px-2 truncate max-w-0"></td>
                            <td class="py-1.5 px-2"></td>
                        </tr>`;
                    }
                }

                heatHtml += `
                <div class="avoid-break mb-6 mt-4">
                    <div class="flex justify-between items-end border-b-2 border-slate-700 pb-1 mb-1">
                        <h3 class="font-extrabold text-[11px] uppercase text-slate-900">Event #${ev.eventNumber}: ${ev.nomor} - ${ev.gender} - ${ev.ku}</h3>
                        <span class="font-bold text-[10px] text-slate-600 uppercase">HEAT ${heatNumber} of ${totalHeats}</span>
                    </div>
                    <table class="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr class="text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-200 bg-slate-50/50 print:bg-transparent">
                                <th class="py-1.5 px-2 w-10 text-center font-bold">LINT</th>
                                <th class="py-1.5 px-2 w-1/2 font-bold">NAMA ATLET</th>
                                <th class="py-1.5 px-2 w-1/3 font-bold">KLUB / SEKOLAH</th>
                                <th class="py-1.5 px-2 text-center font-bold">SEED TIME</th>
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
