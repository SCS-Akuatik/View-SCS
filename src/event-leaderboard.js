import { supabaseClient } from './supabase.js';

let eventData = null;
let certTemplateUrl = null;
let templateImage = new Image();
let baseConfig = null;
let activeSponsors = []; // Wadah sponsor untuk round-robin Ads

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id') || 5; 
    const loadingEl = document.getElementById('loadingIndicator');

    try {
        const { data: event, error: errEvent } = await supabaseClient
            .from('events')
            .select('event_name, config') 
            .eq('id', eventId)
            .single();
        
        if (event) {
            document.getElementById('eventName').innerText = event.event_name;
            eventData = event;

            // 1. TARIK & RENDER SPONSOR DARI DATABASE
            await fetchAndRenderSponsors(eventId);
        }

        // Ambil Template Juara
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

        // Ambil Data Leaderboard
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

// ==========================================
// MESIN IKLAN: RENDER SPONSOR 3 LAPIS
// ==========================================
async function fetchAndRenderSponsors(eventId) {
    try {
        const { data: linkData } = await supabaseClient
            .from('event_sponsors')
            .select('sponsor_ids')
            .eq('event_id', eventId)
            .single();

        if (!linkData || !linkData.sponsor_ids || linkData.sponsor_ids.length === 0) return;

        const { data: sponsors } = await supabaseClient
            .from('master_sponsors')
            .select('*')
            .in('id', linkData.sponsor_ids);

        if (!sponsors || sponsors.length === 0) return;
        
        activeSponsors = sponsors;

        // LAPIS 1: TOP BANNER AWARENESS
        const wrapper = document.getElementById('partnerWrapper');
        if (wrapper) {
            let html = `
                <div class="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 text-center mb-6">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Official Event Partners:</span>
                    <div class="flex items-center justify-center gap-4 md:gap-6 flex-wrap w-full">
            `;
            let boxWidth = sponsors.length === 1 ? '160px' : (sponsors.length === 2 ? '120px' : '90px');
            
            sponsors.forEach(sp => {
                html += `
                    <a href="${sp.link_url || '#'}" target="_blank" class="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-center shrink-0 transition-transform hover:scale-105" style="aspect-ratio: 16/9; width: ${boxWidth}; max-width: 100%;">
                        <img src="${sp.logo_url}" alt="${sp.sponsor_name}" class="w-full h-full object-contain" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-[10px] font-black text-slate-400 text-center uppercase\\'>${sp.sponsor_name}</span>';">
                    </a>
                `;
            });
            html += `</div></div>`;
            wrapper.innerHTML = html;
        }

        // LAPIS 3: STICKY EXCLUSIVE PARTNER (Ambil Sponsor Urutan Pertama sbg VIP)
        const vipSponsor = sponsors[0]; 
        if(!document.getElementById('scs-exclusive-partner')) {
            const partnerHtml = `
                <div id="scs-exclusive-partner" class="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-amber-500/50 shadow-[0_-10px_20px_rgba(0,0,0,0.4)] z-[99999] py-2 md:py-3 px-4">
                    <a href="${vipSponsor.link_url || '#'}" target="_blank" rel="noopener noreferrer" class="max-w-4xl mx-auto flex items-center justify-center gap-4 cursor-pointer group">
                        <span class="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Exclusive Partner</span>
                        <div class="bg-white p-1 rounded-md border border-slate-700 flex items-center justify-center transition-transform group-hover:scale-105" style="aspect-ratio: 16/9; height: 36px;">
                            <img src="${vipSponsor.logo_url}" alt="${vipSponsor.sponsor_name}" class="h-full w-full object-contain" onerror="this.style.display='none'">
                        </div>
                    </a>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', partnerHtml);
            document.body.style.paddingBottom = '70px'; // Beri jarak scroll bawah
        }

    } catch (err) { console.error("Gagal menarik data sponsor:", err); }
}

function renderLeaderboard(data) {
    const listContainer = document.getElementById('leaderboardList');
    const loading = document.getElementById('loadingIndicator');

    loading.classList.add('hidden');

    if (!data || data.length === 0) {
        listContainer.classList.remove('hidden');
        listContainer.innerHTML = `
            <div class="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                <span class="text-4xl block mb-2 opacity-50">🏁</span>
                <p class="text-slate-500 font-bold text-sm">Belum ada hasil resmi yang dipublish wasit.</p>
            </div>`;
        return;
    }

    listContainer.classList.remove('hidden');
    
    // Grouping by Nomor Lomba, Gender, KU
    const grouped = data.reduce((acc, curr) => {
        const key = `${curr.nomor_lomba} ${curr.gender} ${curr.kelompok_umur}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
    }, {});

    let html = '';
    let categoryIndex = 0; // Buat Index Round-Robin Sponsor
    
    for (const [kategori, listJuara] of Object.entries(grouped)) {
        
        // LAPIS 2: TARGETED CATEGORY SPONSOR (Round-Robin Injeksi per Kategori)
        let categorySponsorHtml = '';
        if (activeSponsors.length > 0) {
            const spIndex = categoryIndex % activeSponsors.length;
            const sp = activeSponsors[spIndex];
            categorySponsorHtml = `
                <div class="bg-slate-50 border-b border-slate-100 p-2 md:p-3 flex justify-between items-center">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        Supported By: <span class="text-blue-900">${sp.sponsor_name}</span>
                    </span>
                    <a href="${sp.link_url || '#'}" target="_blank" class="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center hover:scale-105 transition-transform" style="aspect-ratio: 16/9; width: 50px;">
                        <img src="${sp.logo_url}" class="w-full h-full object-contain" onerror="this.style.display='none'">
                    </a>
                </div>
            `;
        }

        html += `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 relative hover:shadow-md transition-shadow">
            <div class="bg-slate-900 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                <span class="text-lg">🏊‍♂️</span>
                <h4 class="font-black text-amber-400 text-[13px] md:text-sm tracking-wide uppercase">${kategori}</h4>
            </div>
            ${categorySponsorHtml}
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
                            <h5 class="font-black text-slate-800 text-sm md:text-base uppercase tracking-tight leading-tight">${j.nama_peserta}</h5>
                            <p class="text-[10px] md:text-xs text-slate-500 font-bold mb-1 mt-0.5">🏠 ${j.klub_asal}</p>
                            <span class="inline-block bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded font-black tracking-wider">⏱️ ${j.catatan_waktu}</span>
                        </div>
                    </div>
                    <button onclick="downloadSertifikatJuara('${dataJuaraObj}')" class="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 shrink-0 border border-emerald-400">
                        <span>⬇️</span> Cetak Piagam
                    </button>
                </div>
            `;
        });
        html += `</div></div>`;
        
        categoryIndex++; // Naikkan index untuk sponsor card selanjutnya
    }
    listContainer.innerHTML = html;
}

// ==========================================
// FUNGSI RENDER CETAK PIAGAM (TIDAK DIUBAH)
// ==========================================
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
