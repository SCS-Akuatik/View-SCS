import { supabaseClient } from './supabase.js';

let eventData = null;
let certConfig = null;
let templateImage = new Image();
let pesertaData = [];

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const loadingEl = document.getElementById('loadingIndicator');

    if (!eventId) {
        loadingEl.innerHTML = "❌ Link tidak valid. ID Lomba tidak ditemukan.";
        return;
    }

    try {
        // 1. Ambil Nama Event (SUDAH DIPERBAIKI SESUAI SQL: event_name)
        const { data: event, error: errEvent } = await supabaseClient
            .from('events')
            .select('event_name') 
            .eq('id', eventId)
            .single();
        
        if (errEvent) throw new Error("Gagal load event: " + errEvent.message);

        if (event) {
            document.getElementById('eventName').innerText = event.event_name;
            eventData = event;
        }

        // 2. Ambil Template Sertifikat
        const { data: cert, error: errCert } = await supabaseClient
            .from('event_certificates')
            .select('*')
            .eq('event_id', eventId)
            .eq('tipe', 'peserta')
            .single();

        if (errCert || !cert) {
            loadingEl.innerHTML = "❌ Panitia belum menyimpan template sertifikat untuk event ini.";
            return;
        }

        certConfig = cert.config_json;
        templateImage.crossOrigin = "Anonymous"; 
        templateImage.src = cert.template_url;

        // 3. Ambil Daftar Peserta
        // PENTING: Saat ini pakai asumsi tabel 'event_registrations'
        // Kalau tabel peserta lu namanya beda, pesan error bakal muncul di layar.
        const { data: peserta, error: errPeserta } = await supabaseClient
            .from('event_registrations') // <-- (Catatan buat lu: cek nama tabel ini di Supabase)
            .select('nama_atlet, klub_asal') // <-- (Cek juga apa bener nama kolomnya ini)
            .eq('event_id', eventId);

        if (errPeserta) throw new Error("Gagal meload data peserta: " + errPeserta.message);

        if (peserta) {
            // Filter duplikat agar 1 anak hanya muncul 1 tombol download
            const uniquePeserta = Array.from(new Set(peserta.map(a => a.nama_atlet)))
                .map(nama => {
                    return peserta.find(a => a.nama_atlet === nama)
                });
            
            pesertaData = uniquePeserta;
            renderList(pesertaData);
        }

    } catch (error) {
        console.error(error);
        loadingEl.innerHTML = `<span class="text-red-600">❌ Error Sistem: ${error.message}</span>`;
    }
});

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

document.getElementById('searchInput').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = pesertaData.filter(p => p.nama_atlet.toLowerCase().includes(keyword));
    renderList(filtered);
});

window.downloadSertifikat = function(namaAtlet) {
    if (!certConfig || !templateImage.complete) {
        alert("Sistem masih menyiapkan template. Mohon tunggu beberapa detik lalu coba lagi.");
        return;
    }

    alert(`⏳ Sedang merakit sertifikat untuk ${namaAtlet}... Mohon tunggu.`);

    const canvas = document.getElementById('renderCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = templateImage.width;
    canvas.height = templateImage.height;

    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

    const setNama = certConfig.nama;

    ctx.textAlign = "center"; 
    
    if (setNama.font.includes('Great Vibes')) {
        ctx.font = `${setNama.size}px ${setNama.font}`;
    } else {
        ctx.font = `bold ${setNama.size}px ${setNama.font}`;
    }
    
    ctx.fillStyle = setNama.color;
    
    const namaCantik = namaAtlet.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    ctx.fillText(namaCantik, parseInt(setNama.x), parseInt(setNama.y));

    const dataURL = canvas.toDataURL("image/jpeg", 0.9);
    
    const link = document.createElement('a');
    link.download = `Sertifikat_${namaAtlet.replace(/\s+/g, '_')}_${eventData.event_name.replace(/\s+/g, '')}.jpg`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
