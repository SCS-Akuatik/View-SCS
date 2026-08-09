import { supabaseClient } from './supabase.js';

let eventsData = [];
let filteredEvents = [];
let selectedEventConfig = {};
let currentSelectedEventId = null;
let masterSponsors = [];

// State buat nampung URL gambar kalau admin milih dari Master Bank
let reusedLogoUrl = null;
let reusedCoverUrl = null;

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. GERBANG SATPAM SUPER ADMIN
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError || !session) {
            window.location.replace('/auth.html');
            return;
        }

        if (session.user.email !== 'radityaraja@gmail.com') {
            alert('Akses Ditolak! Ini Area Khusus Super Admin SCS.');
            window.location.replace('/dashboard.html');
            return;
        }

        // 2. LOAD SEMUA EVENT (Pake 'id' descending)
        const { data: events, error: errEvents } = await supabaseClient
            .from('events')
            .select('id, event_name, subdomain, kota, provinsi, config')
            .order('id', { ascending: false });

        if (errEvents) throw errEvents;
        
        eventsData = events || [];
        filteredEvents = [...eventsData];
        renderEventTable();

        // 3. LOAD MASTER BANK SPONSOR
        loadMasterBank();

    } catch (err) {
        alert("Sistem Error: " + err.message);
    }
});

// FITUR PENCARIAN REALTIME
document.getElementById('searchEvent').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filteredEvents = eventsData.filter(ev => 
        (ev.event_name && ev.event_name.toLowerCase().includes(query)) ||
        (ev.kota && ev.kota.toLowerCase().includes(query)) ||
        (ev.subdomain && ev.subdomain.toLowerCase().includes(query))
    );
    renderEventTable();
});

// RENDER TABEL EVENT
function renderEventTable() {
    const tbody = document.getElementById('eventTableBody');
    tbody.innerHTML = '';

    if (filteredEvents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 italic">Tidak ada event yang ditemukan.</td></tr>`;
        return;
    }

    filteredEvents.forEach((ev, index) => {
        const hasAds = ev.config && ev.config.ads_sponsor_name;
        const statusBadge = hasAds 
            ? `<span class="bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Active</span>`
            : `<span class="bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">Kosong</span>`;
        
        const sponsorName = hasAds ? `<p class="text-[9px] text-emerald-500/70 font-bold mt-1 truncate max-w-[200px]">Ads: ${ev.config.ads_sponsor_name}</p>` : '';

        const isSelected = currentSelectedEventId == ev.id;
        const rowClass = isSelected 
            ? "bg-amber-900/20 border-l-4 border-amber-500 transition-colors" 
            : "hover:bg-slate-800/50 transition-colors cursor-pointer border-l-4 border-transparent";

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.id = `row-event-${ev.id}`;
        tr.onclick = () => window.pilihEventLomba(ev.id);
        
        tr.innerHTML = `
            <td class="p-4 text-center text-slate-500 font-bold">${index + 1}</td>
            <td class="p-4">
                <p class="font-bold text-slate-200 text-sm truncate max-w-[300px]">${ev.event_name}</p>
                ${sponsorName}
            </td>
            <td class="p-4">
                <div class="flex flex-col gap-0.5">
                    <span class="text-[10px] text-blue-400 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded w-fit">${ev.subdomain}.funswimming.my.id</span>
                    <span class="text-[10px] text-slate-500 font-medium">${ev.kota || ''}, ${ev.provinsi || ''}</span>
                </div>
            </td>
            <td class="p-4 text-center">${statusBadge}</td>
            <td class="p-4 text-center">
                <button class="bg-slate-700 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-sm">
                    ${isSelected ? 'Dipilih' : 'Suntik'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// FUNGSI SAAT EVENT DIPILIH
window.pilihEventLomba = function(eventId) {
    currentSelectedEventId = eventId;
    renderEventTable();

    const workspace = document.getElementById('adsWorkspace');
    const event = eventsData.find(ev => ev.id == eventId);
    
    if (!event) return;

    document.getElementById('labelSelectedEvent').innerText = event.event_name;

    reusedLogoUrl = null;
    reusedCoverUrl = null;
    document.getElementById('uploadLogo').value = '';
    document.getElementById('uploadCover').value = '';
    document.getElementById('statusMsg').classList.add('hidden');

    selectedEventConfig = event.config || {};

    document.getElementById('inputSponsorName').value = selectedEventConfig.ads_sponsor_name || '';
    document.getElementById('inputSponsorUrl').value = selectedEventConfig.ads_link_url || '';

    const previewLogo = document.getElementById('previewLogo');
    if (selectedEventConfig.ads_sponsor_logo) {
        previewLogo.src = selectedEventConfig.ads_sponsor_logo;
        previewLogo.classList.remove('hidden');
        reusedLogoUrl = selectedEventConfig.ads_sponsor_logo;
    } else {
        previewLogo.src = '';
        previewLogo.classList.add('hidden');
    }

    const previewCover = document.getElementById('previewCover');
    if (selectedEventConfig.ads_cover_a4) {
        previewCover.src = selectedEventConfig.ads_cover_a4;
        previewCover.classList.remove('hidden');
        reusedCoverUrl = selectedEventConfig.ads_cover_a4;
    } else {
        previewCover.src = '';
        previewCover.classList.add('hidden');
    }

    workspace.classList.remove('hidden');
    workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// FUNGSI LOAD MASTER BANK SPONSOR
async function loadMasterBank() {
    const container = document.getElementById('sponsorBankContainer');
    const counter = document.getElementById('bankCounter');
    
    try {
        const { data, error } = await supabaseClient
            .from('master_sponsors')
            .select('*')
            .order('id', { ascending: false });
            
        if (error) throw error;
        masterSponsors = data || [];
        
        counter.innerText = `${masterSponsors.length} Brand`;
        
        if (masterSponsors.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500 italic col-span-full">Belum ada data sponsor tersimpan.</p>';
            return;
        }

        container.innerHTML = '';
        masterSponsors.forEach(sponsor => {
            const sponsorDataString = encodeURIComponent(JSON.stringify(sponsor));
            
            container.innerHTML += `
                <div onclick="useMasterSponsor('${sponsorDataString}')" class="bg-slate-800 rounded-xl p-2 cursor-pointer hover:ring-2 hover:ring-amber-500 hover:-translate-y-1 transition-all shadow-md group border border-slate-700">
                    <div class="h-14 w-full flex items-center justify-center mb-2 overflow-hidden bg-slate-900 rounded border border-slate-800">
                        <img src="${sponsor.logo_url || '/images/logo.png'}" class="h-full w-full object-contain opacity-50 group-hover:opacity-100 transition-all">
                    </div>
                    <p class="text-[10px] font-black text-slate-300 truncate text-center">${sponsor.sponsor_name}</p>
                </div>
            `;
        });

    } catch (err) {
        console.error("Gagal load Master Bank:", err);
    }
}

// FUNGSI SAAT SPONSOR DARI BANK DIKLIK
window.useMasterSponsor = function(encodedData) {
    const sponsor = JSON.parse(decodeURIComponent(encodedData));
    
    document.getElementById('inputSponsorName').value = sponsor.sponsor_name || '';
    document.getElementById('inputSponsorUrl').value = sponsor.link_url || '';
    
    document.getElementById('uploadLogo').value = '';
    document.getElementById('uploadCover').value = '';
    
    reusedLogoUrl = sponsor.logo_url || '';
    reusedCoverUrl = sponsor.cover_url || '';
    
    const previewLogo = document.getElementById('previewLogo');
    if (reusedLogoUrl) {
        previewLogo.src = reusedLogoUrl;
        previewLogo.classList.remove('hidden');
    }
    
    const previewCover = document.getElementById('previewCover');
    if (reusedCoverUrl) {
        previewCover.src = reusedCoverUrl;
        previewCover.classList.remove('hidden');
    }

    document.getElementById('adsWorkspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.classList.remove('hidden');
    statusMsg.innerHTML = `✅ Aset <b>${sponsor.sponsor_name}</b> di-load dari Bank Sponsor!`;
    statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-emerald-900/30 text-emerald-400 block mt-4 border border-emerald-500/30";
};

// PREVIEW GAMBAR LOKAL
function setupPreview(inputId, imgId, type) {
    document.getElementById(inputId).addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.getElementById(imgId);
                img.src = event.target.result;
                img.classList.remove('hidden');
                
                if (type === 'logo') reusedLogoUrl = null;
                if (type === 'cover') reusedCoverUrl = null;
                
                document.getElementById('statusMsg').classList.add('hidden');
            }
            reader.readAsDataURL(file);
        }
    });
}
setupPreview('uploadLogo', 'previewLogo', 'logo');
setupPreview('uploadCover', 'previewCover', 'cover');

// ==========================================
// FUNGSI HELPER UPLOAD (DIPAKAI 2 TOMBOL)
// ==========================================
async function uploadAdAsset(file, brandName, type) {
    const fileExt = file.name.split('.').pop();
    const fileName = `brand_${brandName.replace(/\s+/g, '_')}_${type}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabaseClient.storage.from('sponsor-ads').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage.from('sponsor-ads').getPublicUrl(fileName);
    return urlData.publicUrl;
}

// ==========================================
// TOMBOL 1: SUNTIKKAN IKLAN KE EVENT
// ==========================================
document.getElementById('btnSaveAds').addEventListener('click', async () => {
    if (!currentSelectedEventId) return alert("Pilih event dari tabel dulu!");

    const valName = document.getElementById('inputSponsorName').value.trim();
    const valLink = document.getElementById('inputSponsorUrl').value.trim();
    
    const fileLogo = document.getElementById('uploadLogo').files[0];
    const fileCover = document.getElementById('uploadCover').files[0];

    const btn = document.getElementById('btnSaveAds');
    const statusMsg = document.getElementById('statusMsg');

    btn.innerHTML = "⏳ MENGUNGGAH & MENYUNTIK...";
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    statusMsg.classList.remove('hidden');
    statusMsg.innerText = "Mempersiapkan injeksi...";
    statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-amber-900/30 text-amber-400 block mt-4 border border-amber-500/30";

    try {
        let finalLogoUrl = reusedLogoUrl || '';
        let finalCoverUrl = reusedCoverUrl || '';
        let isNewUpload = false;

        if (fileLogo) {
            statusMsg.innerText = "Mengunggah Logo Sponsor Baru...";
            finalLogoUrl = await uploadAdAsset(fileLogo, valName, 'logo');
            isNewUpload = true;
        }
        if (fileCover) {
            statusMsg.innerText = "Mengunggah Sampul A4 Baru...";
            finalCoverUrl = await uploadAdAsset(fileCover, valName, 'cover');
            isNewUpload = true;
        }

        const newConfig = {
            ...selectedEventConfig,
            ads_sponsor_name: valName,
            ads_sponsor_logo: finalLogoUrl,
            ads_cover_a4: finalCoverUrl,
            ads_link_url: valLink
        };

        statusMsg.innerText = "Menyuntikkan Iklan ke Event...";

        const { error: updateError } = await supabaseClient
            .from('events')
            .update({ config: newConfig })
            .eq('id', currentSelectedEventId);

        if (updateError) throw updateError;

        // SIMPAN OTOMATIS KE MASTER BANK
        if (valName && (isNewUpload || !masterSponsors.some(s => s.sponsor_name === valName))) {
            const existing = masterSponsors.find(s => s.sponsor_name.toLowerCase() === valName.toLowerCase());
            if (existing) {
                await supabaseClient.from('master_sponsors').update({
                    link_url: valLink, logo_url: finalLogoUrl, cover_url: finalCoverUrl
                }).eq('id', existing.id);
            } else {
                await supabaseClient.from('master_sponsors').insert([{
                    sponsor_name: valName, link_url: valLink, logo_url: finalLogoUrl, cover_url: finalCoverUrl
                }]);
            }
            loadMasterBank(); 
        }

        selectedEventConfig = newConfig;
        reusedLogoUrl = finalLogoUrl;
        reusedCoverUrl = finalCoverUrl;
        
        const eventIndex = eventsData.findIndex(ev => ev.id == currentSelectedEventId);
        if (eventIndex !== -1) eventsData[eventIndex].config = newConfig;
        
        filteredEvents = [...eventsData]; 
        renderEventTable();

        statusMsg.innerText = "✅ BOOM! Iklan berhasil disuntikkan ke Event!";
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-emerald-900/30 text-emerald-400 block mt-4 border border-emerald-500/30";

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "❌ Error: " + err.message;
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-900/30 text-red-400 block mt-4 border border-red-500/30";
    } finally {
        btn.innerHTML = "🚀 SUNTIKKAN IKLAN KE EVENT INI";
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});

// ==========================================
// TOMBOL 2: SIMPAN KE MASTER BANK SAJA
// ==========================================
document.getElementById('btnSaveToBankOnly').addEventListener('click', async () => {
    const valName = document.getElementById('inputSponsorName').value.trim();
    const valLink = document.getElementById('inputSponsorUrl').value.trim();
    
    const fileLogo = document.getElementById('uploadLogo').files[0];
    const fileCover = document.getElementById('uploadCover').files[0];

    if (!valName) return alert("Nama Sponsor wajib diisi untuk disimpan ke Bank!");
    if (!fileLogo && !fileCover && !reusedLogoUrl && !reusedCoverUrl) {
        return alert("Pilih minimal 1 gambar (Logo atau Sampul) untuk disimpan!");
    }

    const btn = document.getElementById('btnSaveToBankOnly');
    const statusMsg = document.getElementById('statusMsg');

    btn.innerHTML = "⏳ MENYIMPAN KE BANK...";
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    statusMsg.classList.remove('hidden');
    statusMsg.innerText = "Mengunggah aset...";
    statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-slate-800 text-slate-300 block mt-4 border border-slate-600";

    try {
        let finalLogoUrl = reusedLogoUrl || '';
        let finalCoverUrl = reusedCoverUrl || '';

        if (fileLogo) finalLogoUrl = await uploadAdAsset(fileLogo, valName, 'logo');
        if (fileCover) finalCoverUrl = await uploadAdAsset(fileCover, valName, 'cover');

        // Cek apakah sponsor sudah ada di bank
        const existing = masterSponsors.find(s => s.sponsor_name.toLowerCase() === valName.toLowerCase());
        
        if (existing) {
            await supabaseClient.from('master_sponsors').update({
                link_url: valLink,
                logo_url: finalLogoUrl,
                cover_url: finalCoverUrl
            }).eq('id', existing.id);
        } else {
            await supabaseClient.from('master_sponsors').insert([{
                sponsor_name: valName,
                link_url: valLink,
                logo_url: finalLogoUrl,
                cover_url: finalCoverUrl
            }]);
        }

        loadMasterBank(); 

        statusMsg.innerText = "✅ Mantap! Aset berhasil masuk ke Master Bank.";
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-emerald-900/30 text-emerald-400 block mt-4 border border-emerald-500/30";

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "❌ Error: " + err.message;
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-900/30 text-red-400 block mt-4 border border-red-500/30";
    } finally {
        btn.innerHTML = "📥 Simpan Aset ke Master Bank Dulu";
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});
