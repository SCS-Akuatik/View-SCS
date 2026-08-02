import { supabaseClient } from '../src/supabase.js';

let currentEventId = null;
let allHeats = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Ambil ID Kejuaraan dari URL (misal: ?id=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id'); 

    if (!currentEventId) {
        alert("ID Kejuaraan tidak ditemukan di URL!");
        return;
    }

    await loadAllHeats();
});

async function loadAllHeats() {
    try {
        const { data, error } = await supabaseClient
            .from('event_heats')
            .select('*')
            .eq('event_id', currentEventId)
            .order('event_number', { ascending: true })
            .order('heat_number', { ascending: true });

        if (error) throw error;
        allHeats = data || [];
        populateDropdown();
    } catch (err) {
        console.error("Gagal menarik data:", err);
        alert("Terjadi kesalahan saat memuat data.");
    }
}

function populateDropdown() {
    const selectEvent = document.getElementById('selectEvent');
    selectEvent.innerHTML = '<option value="">-- Pilih Lomba Untuk Dicetak --</option>';

    // Cari daftar Nomor Lomba yang unik (menghindari duplikat kalau ada 5 heat)
    const uniqueEvents = [...new Map(allHeats.map(item => [item.event_number, item])).values()];
    
    uniqueEvents.forEach(ev => {
        let label = `Event #${ev.event_number}: ${ev.nomor_lomba} - ${ev.gender} - ${ev.kelompok_umur}`;
        selectEvent.innerHTML += `<option value="${ev.event_number}">${label}</option>`;
    });

    // Pas dropdown dipilih, langsung generate klasemen
    selectEvent.addEventListener('change', (e) => {
        const evNum = e.target.value;
        if(evNum) {
            document.getElementById('emptyState').style.display = 'none';
            generateLeaderboard(evNum);
        } else {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('resultTableContainer').innerHTML = '';
        }
    });
}

function generateLeaderboard(eventNumber) {
    // 1. Ambil semua heat yang sesuai sama event yang dipilih
    const targetHeats = allHeats.filter(h => h.event_number == eventNumber);
    if(targetHeats.length === 0) return;

    // Ambil info header lomba dari heat pertama
    const headerInfo = targetHeats[0];

    // 2. Tumpahkan semua perenang ke satu ember besar
    let semuaAtlet = [];
    targetHeats.forEach(heat => {
        heat.lanes_data.forEach(atlet => {
            if (atlet.nama) {
                semuaAtlet.push({
                    ...atlet,
                    asal_heat: heat.heat_number // Nyatet dia tadi dari heat berapa
                });
            }
        });
    });

    // 3. LOGIKA SORTING JUARA (Murni Javascript)
    semuaAtlet.sort((a, b) => {
        let timeA = a.waktu_tempuh || 'NT';
        let timeB = b.waktu_tempuh || 'NT';

        let isInvalidA = (timeA === 'NT' || timeA === 'DQ');
        let isInvalidB = (timeB === 'NT' || timeB === 'DQ');

        // NT dan DQ diusir ke posisi paling bawah
        if (isInvalidA && !isInvalidB) return 1;
        if (!isInvalidA && isInvalidB) return -1;
        
        // Kalau sesama NT / DQ
        if (isInvalidA && isInvalidB) {
            if (timeA === 'DQ' && timeB === 'NT') return 1;
            if (timeA === 'NT' && timeB === 'DQ') return -1;
            return 0;
        }

        // Adu kecepatan (karena format udah MM:SS.ms, bisa langsung bandingin string)
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;
        return 0;
    });

    // 4. Lempar data yang udah urut ke HTML
    renderTable(semuaAtlet, headerInfo);
}

function renderTable(leaderboard, headerInfo) {
    const container = document.getElementById('resultTableContainer');
    
    let tbodyHtml = '';
    leaderboard.forEach((atlet, index) => {
        let rank = index + 1;
        let rankDisplay = rank;
        let styleRank = "";

        // Logika pewarnaan UI
        if (atlet.waktu_tempuh === 'NT' || atlet.waktu_tempuh === 'DQ' || !atlet.waktu_tempuh) {
            rankDisplay = "-";
            styleRank = "color: #94a3b8;"; // Teks pudar
        } else if (rank === 1) {
            styleRank = "font-weight: 900; background-color: #fef3c7;"; // Kuning Emas
        } else if (rank === 2) {
            styleRank = "font-weight: 900; background-color: #f1f5f9;"; // Perak
        } else if (rank === 3) {
            styleRank = "font-weight: 900; background-color: #ffedd5;"; // Perunggu
        }

        tbodyHtml += `
            <tr>
                <td style="text-align: center; width: 50px; ${styleRank}">${rankDisplay}</td>
                <td style="font-weight: bold; text-transform: uppercase;">${atlet.nama}</td>
                <td style="text-transform: uppercase; font-size: 0.85em;">${atlet.klub}</td>
                <td style="text-align: center;">H${atlet.asal_heat} / L${atlet.lane}</td>
                <td style="text-align: center; font-family: monospace; font-weight: bold;">
                    ${atlet.waktu_tempuh || 'NT'}
                </td>
            </tr>
        `;
    });

    // Rangkai kertas A4
    const html = `
        <div style="text-align: center; margin-bottom: 20px; text-transform: uppercase;">
            <h2 style="font-size: 1.5rem; font-weight: 900; margin: 0;">OFFICIAL RESULT</h2>
            <h3 style="font-size: 1.1rem; font-weight: bold; margin: 5px 0;">EVENT #${headerInfo.event_number}: ${headerInfo.nomor_lomba} - ${headerInfo.gender}</h3>
            <p style="font-size: 0.9rem; color: #475569;">Kelompok Umur: ${headerInfo.kelompok_umur}</p>
        </div>
        
        <table class="screen-table">
            <thead>
                <tr>
                    <th style="text-align: center;">Rank</th>
                    <th>Nama Perenang</th>
                    <th>Klub</th>
                    <th style="text-align: center;">Heat / Lane</th>
                    <th style="text-align: center;">Catatan Waktu</th>
                </tr>
            </thead>
            <tbody>
                ${tbodyHtml}
            </tbody>
        </table>
        
        <!-- Area Tanda Tangan -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 0.85rem;">
            <div>
                <p><strong>Dicetak pada:</strong> ${new Date().toLocaleString('id-ID')}</p>
            </div>
            <div style="text-align: center; width: 220px;">
                <p style="font-weight: bold;">Referee / Hakim Utama</p>
                <br><br><br>
                <p style="border-top: 1px solid black; padding-top: 5px;">( ........................................ )</p>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
