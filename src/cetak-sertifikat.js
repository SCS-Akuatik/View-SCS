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
        templateImage.crossOrigin = "anonymous"; 
        // TRIK ANTI CACHE CORS:
        templateImage.src = cert.template_url + "?t=" + new Date().getTime();

        const { data: peserta, error: errPeserta } = await supabaseClient
            .from('event_registrations') 
            .select('nama_peserta, klub_asal') 
            .eq('event_id', eventId);

        if (errPeserta) throw new Error("Gagal meload data peserta: " + errPeserta.message);

        if (peserta) {
            const uniquePeserta = Array.from(new Set(peserta.map(a => a.nama_peserta)))
                .map(nama => {
                    return peserta.find(a => a.nama_peserta === nama)
                });
            
            pesertaData = uniquePeserta;
            renderList(pesertaData);
        }

    } catch (error) {
        console.error(error);
        loadingEl.innerHTML = `<span class="text-red-600 font-bold">❌ Error Sistem: ${error.message}</span>`;
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
        const safeName = p.nama_peserta.replace(/'/g, "\\'");
        html += `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:border-blue-300 transition">
            <div>
                <h3 class="font-black text-slate-800 text-sm uppercase">${p.nama_peserta}</h3>
                <p class="text-xs text-slate-500 font-bold mt-1">🏊‍♂️ ${p.klub_asal || 'Unattached'}</p>
            </div>
            <button onclick="downloadSertifikat('${safeName}')" class="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2">
                <span>⬇️</span> Unduh Sertifikat
            </button>
        </div>
        `;
    });
    listContainer.innerHTML = html;
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = pesertaData.filter(p => p.nama_peserta.toLowerCase().includes(keyword));
    renderList(filtered);
});

window.downloadSertifikat = function(namaPeserta) {
    if (!certConfig || !templateImage.complete) {
        alert("Sistem masih menyiapkan template. Mohon tunggu...");
        return;
    }

    try {
        alert("1/3. Mulai merakit gambar...");
        
        const canvas = document.getElementById('renderCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = templateImage.width;
        canvas.height = templateImage.height;

        ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

        const setNama = certConfig.nama;
        
        // JURUS FIX ERROR 'includes': Ambil dari sharedStyle
        const fontName = certConfig.sharedStyle?.font || setNama.font || "'Great Vibes', cursive";
        const fontColor = certConfig.sharedStyle?.color || setNama.color || "#1e293b";

        ctx.textAlign = "center"; 
        
        if (fontName.includes('Great Vibes')) {
            ctx.font = `${setNama.size}px ${fontName}`;
        } else {
            ctx.font = `bold ${setNama.size}px ${fontName}`;
        }
        ctx.fillStyle = fontColor;
        
        const namaCantik = namaPeserta.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        ctx.fillText(namaCantik, parseInt(setNama.x), parseInt(setNama.y));

        alert("2/3. Gambar berhasil dirakit! Menyiapkan file unduhan...");
        
        // Eksekusi Blob Aman untuk HP
        canvas.toBlob(function(blob) {
            if (!blob) {
                alert("Gagal merender gambar! Kemungkinan diblokir memori HP atau Izin CORS Supabase.");
                return;
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = `Sertifikat_${namaPeserta.replace(/\s+/g, '_')}_${eventData.event_name.replace(/\s+/g, '')}.jpg`;
            
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                alert("3/3. ✅ SUKSES! Silakan cek notifikasi / folder Download di HP Anda.");
            }, 300);
        }, 'image/jpeg', 0.9);

    } catch (err) {
        alert("❌ ERROR RENDER: " + err.message);
        console.error(err);
    }
};

