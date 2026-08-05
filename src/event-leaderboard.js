import { supabaseClient } from './supabase.js';

let eventData = null;
let certTemplateUrl = null;
let templateImage = new Image();
let baseConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || 5; // Default ke 5 untuk testing malam ini
    const loadingEl = document.getElementById('loadingIndicator');

    try {
        // 1. Ambil Nama Event
        const { data: event, error: errEvent } = await supabaseClient
            .from('events')
            .select('event_name') 
            .eq('id', eventId)
            .single();
        
        if (event) {
            document.getElementById('eventName').innerText = event.event_name;
            eventData = event;
        }

        // 2. Ambil Template Sertifikat (Cari 'juara', kalau belum ada, pinjam 'peserta')
        const { data: certs, error: errCert } = await supabaseClient
            .from('event_certificates')
            .select('*')
            .eq('event_id', eventId);

        if (certs && certs.length > 0) {
            let cert = certs.find(c => c.tipe === 'juara');
            if (!cert) {
                // Pinjam template peserta kalau panitia belum upload khusus juara
                cert = certs.find(c => c.tipe === 'peserta'); 
                console.log("Menggunakan template peserta sebagai fallback.");
            }
            if (cert) {
                baseConfig = cert.config_json;
                certTemplateUrl = cert.template_url;
                templateImage.crossOrigin = "Anonymous"; 
                templateImage.src = certTemplateUrl;
            }
        }

        // 3. Ambil Data Juara dari Leaderboard
        const { data: juara, error: errJuara } = await supabaseClient
            .from('event_leaderboard')
            .select('*')
            .eq('event_id', eventId)
            .order('nomor_lomba', { ascending: true })
            .order('peringkat', { ascending: true });

        if (errJuara) throw errJuara;

        renderLeaderboard(juara);

    } catch (error) {
        console.error(error);
        loadingEl.innerHTML = `<span class="text-red-600 font-bold">❌ Error Sistem: ${error.message}</span>`;
    }
});

function renderLeaderboard(data) {
    const listContainer = document.getElementById('leaderboardList');
    const loading = document.getElementById('loadingIndicator');

    loading.classList.add('hidden');

    if (!data || data.length === 0) {
        listContainer.classList.remove('hidden');
        listContainer.innerHTML = `
            <div class="text-center py-10">
                <span class="text-4xl block mb-2">🏁</span>
                <p class="text-slate-500 font-bold text-sm">Belum ada hasil resmi yang dipublish wasit.</p>
            </div>`;
        return;
    }

    listContainer.classList.remove('hidden');
    
    // Kelompokkan berdasarkan Nomor Lomba & KU
    const grouped = data.reduce((acc, curr) => {
        const key = `${curr.nomor_lomba} ${curr.gender} ${curr.kelompok_umur}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
    }, {});

    let html = '';
    
    for (const [kategori, listJuara] of Object.entries(grouped)) {
        html += `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div class="bg-slate-900 px-5 py-3 border-b border-slate-200">
                <h4 class="font-black text-amber-400 text-sm tracking-wide uppercase">🏊‍♂️ ${kategori}</h4>
            </div>
            <div class="divide-y divide-slate-100">
        `;

        listJuara.forEach(j => {
            const medali = j.peringkat === 1 ? '🥇' : j.peringkat === 2 ? '🥈' : '🥉';
            const color = j.peringkat === 1 ? 'text-amber-500' : j.peringkat === 2 ? 'text-slate-400' : 'text-orange-700';
            const safeName = j.nama_peserta.replace(/'/g, "\\'");
            
            // Konversi string objek ke JSON biar gampang di-pass ke onclick
            const dataJuaraObj = encodeURIComponent(JSON.stringify(j));

            html += `
                <div class="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                    <div class="flex items-center gap-4">
                        <div class="text-4xl ${color} drop-shadow-sm">${medali}</div>
                        <div>
                            <h5 class="font-black text-slate-800 text-base uppercase tracking-tight">${j.nama_peserta}</h5>
                            <p class="text-xs text-slate-500 font-bold mb-1">🏠 ${j.klub_asal}</p>
                            <span class="inline-block bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded font-black tracking-wider">⏱️ ${j.catatan_waktu}</span>
                        </div>
                    </div>
                    <button onclick="downloadSertifikatJuara('${dataJuaraObj}')" class="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 shrink-0">
                        <span>⬇️</span> Cetak Piagam
                    </button>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    listContainer.innerHTML = html;
}

window.downloadSertifikatJuara = function(encodedData) {
    if (!templateImage.complete || !certTemplateUrl) {
        alert("Sistem masih menyiapkan template. Mohon tunggu beberapa detik.");
        return;
    }

    const j = JSON.parse(decodeURIComponent(encodedData));
    const kategori = `${j.nomor_lomba} ${j.gender} ${j.kelompok_umur}`;

    alert(`⏳ Sedang mencetak Piagam Juara ${j.peringkat} untuk ${j.nama_peserta}...`);

    const canvas = document.getElementById('renderCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = templateImage.width;
    canvas.height = templateImage.height;

    // 1. Render Background
    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center"; 
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 2. Render Predikat Juara (Posisi di atas nama)
    ctx.font = "bold 45px Arial";
    ctx.fillStyle = "#b45309"; // Warna Gold/Bronze
    ctx.fillText(`JUARA ${j.peringkat}`, centerX, centerY - 120);

    // 3. Render Nama Atlet (Gaya Great Vibes)
    let fontName = baseConfig?.nama?.font || "'Great Vibes', cursive";
    let sizeName = baseConfig?.nama?.size || "110";
    let colorName = baseConfig?.nama?.color || "#1e293b";
    
    if (fontName.includes('Great Vibes')) {
        ctx.font = `${sizeName}px ${fontName}`;
    } else {
        ctx.font = `bold ${sizeName}px ${fontName}`;
    }
    ctx.fillStyle = colorName;
    
    const namaCantik = j.nama_peserta.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    // Jika X/Y ada di baseConfig, pakai itu, kalau nggak pas di tengah
    const nX = baseConfig?.nama?.x ? parseInt(baseConfig.nama.x) : centerX;
    const nY = baseConfig?.nama?.y ? parseInt(baseConfig.nama.y) : centerY - 20;
    
    ctx.fillText(namaCantik, nX, nY);

    // 4. Render Kategori Lomba (Di bawah nama)
    ctx.font = "bold 35px Arial";
    ctx.fillStyle = "#334155"; 
    ctx.fillText(`Prestasi pada nomor: ${kategori}`, centerX, nY + 90);

    // 5. Render Catatan Waktu
    ctx.font = "bold 45px monospace";
    ctx.fillStyle = "#0f766e"; 
    ctx.fillText(`⏱️ ${j.catatan_waktu}`, centerX, nY + 160);

    // Eksekusi Download
    const dataURL = canvas.toDataURL("image/jpeg", 0.9);
    const link = document.createElement('a');
    link.download = `Juara_${j.peringkat}_${j.nama_peserta.replace(/\s+/g, '_')}_${eventData.event_name.replace(/\s+/g, '')}.jpg`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
