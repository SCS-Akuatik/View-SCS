import { supabaseClient } from './supabase.js';

let eventData = null;
let certTemplateUrl = null;
let templateImage = new Image();
let baseConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || 5; 
    const loadingEl = document.getElementById('loadingIndicator');

    try {
        const { data: event, error: errEvent } = await supabaseClient
            .from('events')
            .select('event_name, config') // <-- UPDATE: Tarik config sponsor
            .eq('id', eventId)
            .single();
        
        if (event) {
            document.getElementById('eventName').innerText = event.event_name;
            eventData = event;

            // ==========================================
            // INJEKSI IKLAN SPONSOR (SCS AD NETWORK)
            // ==========================================
            if (event.config && event.config.ads_sponsor_name) {
                const config = event.config;
                const sponsorLogo = config.ads_sponsor_logo || '/images/logo.png';
                const sponsorLink = config.ads_link_url || '#';
                
                const bannerHtml = `
                    <a href="${sponsorLink}" target="_blank" rel="noopener noreferrer" class="block w-full bg-slate-900 border-b border-amber-500/30 py-2.5 hover:bg-slate-800 transition-colors group cursor-pointer z-[60] relative">
                        <div class="max-w-4xl mx-auto px-4 flex items-center justify-center gap-3">
                            <span class="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Official Sponsor</span>
                            <img src="${sponsorLogo}" alt="Sponsor" class="h-6 md:h-8 object-contain drop-shadow-md">
                        </div>
                    </a>
                `;
                document.body.insertAdjacentHTML('afterbegin', bannerHtml);
            }
        }

        // Ambil Template Juara (atau fallback ke Peserta)
        const { data: certs, error: errCert } = await supabaseClient
            .from('event_certificates')
            .select('*')
            .eq('event_id', eventId);

        if (certs && certs.length > 0) {
            let cert = certs.find(c => c.tipe === 'juara');
            if (!cert) {
                cert = certs.find(c => c.tipe === 'peserta'); 
            }
            if (cert) {
                baseConfig = cert.config_json;
                certTemplateUrl = cert.template_url;
                templateImage.crossOrigin = "anonymous"; 
                templateImage.src = certTemplateUrl;
            }
        }

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
            let rankBadge = '';
            if (j.peringkat === 1) {
                rankBadge = `<div class="text-4xl text-amber-500 drop-shadow-sm">🥇</div>`;
            } else if (j.peringkat === 2) {
                rankBadge = `<div class="text-4xl text-slate-400 drop-shadow-sm">🥈</div>`;
            } else if (j.peringkat === 3) {
                rankBadge = `<div class="text-4xl text-orange-700 drop-shadow-sm">🥉</div>`;
            } else {
                rankBadge = `<div class="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full text-lg font-black border-2 border-slate-200 ml-1 mr-1 shadow-sm">${j.peringkat}</div>`;
            }
            
            const dataJuaraObj = encodeURIComponent(JSON.stringify(j));

            html += `
                <div class="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                    <div class="flex items-center gap-4">
                        ${rankBadge}
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
    if (!certTemplateUrl) {
        alert("❌ Template belum disetting! Pastikan EO sudah upload template Juara di Dapur Admin.");
        return;
    }
    if (!templateImage.complete) {
        alert("⏳ Gambar template masih loading... Tunggu sebentar!");
        return;
    }

    try {
        const j = JSON.parse(decodeURIComponent(encodedData));
        alert(`Sedang merakit piagam Juara ${j.peringkat} untuk ${j.nama_peserta}...`);

        const canvas = document.getElementById('renderCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = templateImage.width;
        canvas.height = templateImage.height;

        ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center"; 
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const fontName = baseConfig?.sharedStyle?.font || baseConfig?.nama?.font || "'Great Vibes', cursive";
        const colorName = baseConfig?.sharedStyle?.color || baseConfig?.nama?.color || "#1e293b";

        let strJuara = j.peringkat;
        if (j.peringkat == 1) strJuara = "1 (Satu)";
        else if (j.peringkat == 2) strJuara = "2 (Dua)";
        else if (j.peringkat == 3) strJuara = "3 (Tiga)";
        
        const predd = baseConfig?.extra?.juara;
        const preddX = predd?.x ? parseInt(predd.x) : centerX;
        const preddY = predd?.y ? parseInt(predd.y) : 500;
        const preddSize = predd?.size || "45";
        ctx.font = `bold ${preddSize}px Arial`;
        ctx.fillStyle = colorName; 
        ctx.fillText(strJuara, preddX, preddY);

        const nX = baseConfig?.nama?.x ? parseInt(baseConfig.nama.x) : centerX;
        const nY = baseConfig?.nama?.y ? parseInt(baseConfig.nama.y) : 400;
        const nSize = baseConfig?.nama?.size || "110";
        if (fontName.includes('Great Vibes')) {
            ctx.font = `${nSize}px ${fontName}`;
        } else {
            ctx.font = `bold ${nSize}px ${fontName}`;
        }
        ctx.fillStyle = colorName;
        const namaCantik = j.nama_peserta.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        ctx.fillText(namaCantik, nX, nY);

        const strNomor = j.nomor_lomba; 
        const nom = baseConfig?.extra?.nomorLomba;
        const nomX = nom?.x ? parseInt(nom.x) : centerX;
        const nomY = nom?.y ? parseInt(nom.y) : 600;
        const nomSize = nom?.size || "35";
        ctx.font = `bold ${nomSize}px Arial`;
        ctx.fillStyle = colorName; 
        ctx.fillText(strNomor, nomX, nomY);

        const strKU = `${j.kelompok_umur} ${j.gender}`;
        const ku = baseConfig?.extra?.kelompokUmur;
        const kuX = ku?.x ? parseInt(ku.x) : centerX;
        const kuY = ku?.y ? parseInt(ku.y) : 700;
        const kuSize = ku?.size || "45";
        ctx.font = `bold ${kuSize}px Arial`;
        ctx.fillStyle = colorName; 
        ctx.fillText(strKU, kuX, kuY);
        
        canvas.toBlob(function(blob) {
            if (!blob) {
                alert("Gagal merender gambar! Kemungkinan diblokir memori HP.");
                return;
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = `Juara_${j.peringkat}_${j.nama_peserta.replace(/\s+/g, '_')}.jpg`;
            
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 300);
        }, 'image/jpeg', 0.9);

    } catch (err) {
        alert("❌ ERROR RENDER: " + err.message);
        console.error(err);
    }
};
