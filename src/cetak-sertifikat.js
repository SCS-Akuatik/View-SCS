import { supabaseClient } from './supabase.js'; // Sesuaikan path jika file JS ini di luar

let eventData = null;
let certConfig = null;
let templateImage = new Image();
let pesertaData = [];

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        alert("Link tidak valid. ID Lomba tidak ditemukan.");
        return;
    }

    try {
        // 1. Ambil Nama Event
        const { data: event, error: errEvent } = await supabaseClient
            .from('events')
            .select('nama_event')
            .eq('id', eventId)
            .single();
        
        if (event) {
            document.getElementById('eventName').innerText = event.nama_event;
            eventData = event;
        }

        // 2. Ambil Template & Konfigurasi Sertifikat Peserta
        const { data: cert, error: errCert } = await supabaseClient
            .from('event_certificates')
            .select('*')
            .eq('event_id', eventId)
            .eq('tipe', 'peserta')
            .single();

        if (errCert || !cert) {
            document.getElementById('loadingIndicator').innerHTML = "❌ Panitia belum mengatur template sertifikat untuk event ini.";
            return;
        }

        certConfig = cert.config_json;

        // Muat gambar template ke memory (Background)
        templateImage.crossOrigin = "Anonymous"; // Penting biar gak kena error CORS saat download
        templateImage.src = cert.template_url;

        // 3. Ambil Daftar Unik Peserta di Lomba Ini
        // Asumsi kita ambil dari tabel event_registrations yang nge-link ke f1_athletes
        const { data: peserta, error: errPeserta } = await supabaseClient
            .from('event_registrations')
            .select('nama_atlet, klub_asal') // Sesuaikan nama kolom dengan struktur DB lu
            .eq('event_id', eventId);

        if (peserta) {
            // Filter duplikat (kalau 1 anak ikut 3 gaya, cukup tampilkan 1 kali saja)
            const uniquePeserta = Array.from(new Set(peserta.map(a => a.nama_atlet)))
                .map(nama => {
                    return peserta.find(a => a.nama_atlet === nama)
                });
            
            pesertaData = uniquePeserta;
            renderList(pesertaData);
        }

    } catch (error) {
        console.error(error);
        document.getElementById('loadingIndicator').innerHTML = "Terjadi kesalahan sistem.";
    }
});

// FUNGSI RENDER LIST UI
function renderList(data) {
    const listContainer = document.getElementById('pesertaList');
    const loading = document.getElementById('loadingIndicator');
    const empty = document.getElementById('emptyState');

    loading.classList.add('hidden');

    if (data.length === 0) {
        listContainer.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    listContainer.classList.remove('hidden');
    empty.classList.add('hidden');
    
    let html = '';
    data.forEach((p, index) => {
        html += `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:border-blue-300 transition">
            <div>
                <h3 class="font-black text-slate-800 text-sm uppercase">${p.nama_atlet}</h3>
                <p class="text-xs text-slate-500 font-bold mt-1">🏊‍♂️ ${p.klub_asal || 'Unattached'}</p>
            </div>
            <button onclick="downloadSertifikat('${p.nama_atlet}')" class="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2">
                <span>⬇️</span> Unduh Sertifikat
            </button>
        </div>
        `;
    });

    listContainer.innerHTML = html;
}

// LOGIKA PENCARIAN (REAL-TIME)
document.getElementById('searchInput').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = pesertaData.filter(p => p.nama_atlet.toLowerCase().includes(keyword));
    renderList(filtered);
});

// FUNGSI UTAMA: MESIN RENDER & DOWNLOAD OTOMATIS
window.downloadSertifikat = function(namaAtlet) {
    if (!certConfig || !templateImage.complete) {
        alert("Sistem masih menyiapkan template. Mohon tunggu beberapa detik lalu coba lagi.");
        return;
    }

    // Kasih feedback visual saat loading
    alert(`⏳ Sedang merakit sertifikat untuk ${namaAtlet}... Mohon tunggu.`);

    const canvas = document.getElementById('renderCanvas');
    const ctx = canvas.getContext('2d');

    // Set ukuran canvas sama persis dengan resolusi gambar asli
    canvas.width = templateImage.width;
    canvas.height = templateImage.height;

    // 1. Gambar Template Background
    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

    // 2. Baca settingan dari Admin
    const setNama = certConfig.nama;

    // 3. Render Teks Nama
    ctx.textAlign = "center"; 
    
    // Terapkan Logic Font (Sama seperti saat admin setup)
    if (setNama.font.includes('Great Vibes')) {
        ctx.font = `${setNama.size}px ${setNama.font}`;
    } else {
        ctx.font = `bold ${setNama.size}px ${setNama.font}`;
    }
    
    ctx.fillStyle = setNama.color;
    
    // Konversi nama jadi Title Case (Awal kapital) biar cakep
    const namaCantik = namaAtlet.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    // Cap tulisan ke atas kanvas!
    ctx.fillText(namaCantik, parseInt(setNama.x), parseInt(setNama.y));

    // 4. Download Eksekusi (Jadikan file JPG agar lebih ringan buat WA)
    const dataURL = canvas.toDataURL("image/jpeg", 0.9);
    
    const link = document.createElement('a');
    link.download = `Sertifikat_${namaAtlet.replace(/\s+/g, '_')}_${eventData.nama_event.replace(/\s+/g, '')}.jpg`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
