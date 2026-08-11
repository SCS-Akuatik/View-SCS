import { supabaseClient } from './supabase.js';

let eventsData = [];
let filteredEvents = [];
let currentSelectedEventId = null;
let masterSponsors = [];

let reusedLogoUrl = null;
let reusedCoverUrl = null;

document.addEventListener('DOMContentLoaded', async () => {
    
    if (sessionStorage.getItem('aztec_key') !== 'buka_sesame') {
        document.body.innerHTML = `
            <div style="height:100vh;width:100vw;display:flex;flex-direction:column;align-items:center;justify-content:center;background-color:#0f172a;color:#fbbf24;font-family:sans-serif;text-align:center;position:fixed;top:0;left:0;z-index:999999;">
                <span style="font-size:6rem;margin-bottom:20px;">🛑</span>
                <h1 style="font-size:3rem;font-weight:900;text-transform:uppercase;">Boss pliss jangan lewat sini 🤣</h1>
            </div>`;
        setTimeout(() => window.location.replace('/dashboard.html'), 2500);
        return;
    }

    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) return window.location.replace('/auth.html');


        // 1. Tarik Events
        const { data: events, error: errEvents } = await supabaseClient
            .from('events')
            .select('id, event_name, subdomain, kota, provinsi')
            .order('id', { ascending: false });

        if (errEvents) throw errEvents;

        // 2. Tarik Event Sponsors (Arsitektur Baru)
        const { data: eventSponsors, error: errSponsors } = await supabaseClient
            .from('event_sponsors')
            .select('*');

        // 3. Gabungkan hitungan sponsor ke eventsData
        eventsData = events.map(ev => {
            const link = eventSponsors?.find(es => es.event_id === ev.id);
            ev.sponsor_count = (link && link.sponsor_ids) ? link.sponsor_ids.length : 0;
            return ev;
        });

        filteredEvents = [...eventsData];
        renderEventTable();
        loadMasterBank();

    } catch (err) {
        alert("Sistem Error: " + err.message);
    }
});

document.getElementById('searchEvent').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filteredEvents = eventsData.filter(ev => 
        (ev.event_name && ev.event_name.toLowerCase().includes(query)) ||
        (ev.kota && ev.kota.toLowerCase().includes(query)) ||
        (ev.subdomain && ev.subdomain.toLowerCase().includes(query))
    );
    renderEventTable();
});

function renderEventTable() {
    const tbody = document.getElementById('eventTableBody');
    tbody.innerHTML = '';

    if (filteredEvents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 italic">Tidak ada event yang ditemukan.</td></tr>`;
        return;
    }

    filteredEvents.forEach((ev, index) => {
        // Tampilan Badge Hijau kalau ada sponsor
        const statusBadge = ev.sponsor_count > 0 
            ? `<span class="bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">${ev.sponsor_count} SPONSOR</span>`
            : `<span class="bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">KOSONG</span>`;
        
        const isSelected = currentSelectedEventId == ev.id;
        const rowClass = isSelected 
            ? "bg-amber-900/20 border-l-4 border-amber-500 transition-colors" 
            : "hover:bg-slate-800/50 transition-colors cursor-pointer border-l-4 border-transparent";

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.onclick = () => window.pilihEventLomba(ev.id);
        
        tr.innerHTML = `
            <td class="p-4 text-center text-slate-500 font-bold">${index + 1}</td>
            <td class="p-4">
                <p class="font-bold text-slate-200 text-sm truncate max-w-[300px]">${ev.event_name}</p>
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

window.pilihEventLomba = function(eventId) {
    currentSelectedEventId = eventId;
    renderEventTable(); // Update baris yang nyala

    const event = eventsData.find(ev => ev.id == eventId);
    if (!event) return;

    document.getElementById('labelSelectedEvent').innerText = event.event_name;

    // Bersihkan Form
    reusedLogoUrl = null;
    reusedCoverUrl = null;
    document.getElementById('inputSponsorName').value = '';
    document.getElementById('inputSponsorUrl').value = '';
    document.getElementById('uploadLogo').value = '';
    document.getElementById('uploadCover').value = '';
    document.getElementById('previewLogo').classList.add('hidden');
    document.getElementById('previewCover').classList.add('hidden');
    document.getElementById('statusMsg').classList.add('hidden');

    // Tarik dan Render Sponsor Aktif
    renderActiveSponsors();

    const workspace = document.getElementById('adsWorkspace');
    workspace.classList.remove('hidden');
    workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

async function renderActiveSponsors() {
    const grid = document.getElementById('activeSponsorsGrid');
    grid.innerHTML = '<p class="text-xs text-slate-500 col-span-full">Memuat...</p>';

    const { data: linkData } = await supabaseClient.from('event_sponsors').select('sponsor_ids').eq('event_id', currentSelectedEventId).single();

    if (!linkData || !linkData.sponsor_ids || linkData.sponsor_ids.length === 0) {
        grid.innerHTML = '<p class="text-xs text-slate-500 italic col-span-full">Belum ada sponsor yang disuntikkan ke event ini.</p>';
        return;
    }

    const activeIds = linkData.sponsor_ids;
    const activeSponsors = masterSponsors.filter(s => activeIds.includes(s.id));

    grid.innerHTML = '';
    activeSponsors.forEach(sponsor => {
        grid.innerHTML += `
            <div class="relative bg-slate-800 rounded-lg p-2 border border-emerald-500/50 shadow-md">
                <button onclick="removeSponsorFromEvent(${sponsor.id})" class="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full z-10 shadow" title="Cabut dari Event">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div class="h-10 w-full flex items-center justify-center mb-1 overflow-hidden bg-white rounded">
                    <img src="${sponsor.logo_url || '/images/logo.png'}" class="h-full w-full object-contain p-1">
                </div>
                <p class="text-[9px] font-black text-slate-300 truncate text-center">${sponsor.sponsor_name}</p>
            </div>
        `;
    });
}

window.removeSponsorFromEvent = async function(sponsorId) {
    if(!confirm("Cabut sponsor ini dari event?")) return;
    try {
        const { data: linkData } = await supabaseClient.from('event_sponsors').select('*').eq('event_id', currentSelectedEventId).single();
        if (linkData) {
            const newIds = linkData.sponsor_ids.filter(id => id !== sponsorId);
            await supabaseClient.from('event_sponsors').update({ sponsor_ids: newIds }).eq('id', linkData.id);
            
            // Update tabel list
            const eventIndex = eventsData.findIndex(ev => ev.id == currentSelectedEventId);
            if (eventIndex !== -1) eventsData[eventIndex].sponsor_count = newIds.length;
            
            renderActiveSponsors();
            renderEventTable();
        }
    } catch(e) { alert("Error: " + e.message); }
}

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
                <div class="relative bg-slate-800 rounded-xl p-2 hover:ring-2 hover:ring-amber-500 transition-all shadow-md group border border-slate-700">
                    <button onclick="hapusMasterSponsor(${sponsor.id}, '${sponsor.sponsor_name}', event)" class="absolute top-1 right-1 bg-red-600/90 hover:bg-red-500 text-white p-1 rounded z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow" title="Hapus Sponsor dari Bank">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                    <div onclick="useMasterSponsor('${sponsorDataString}')" class="cursor-pointer">
                        <div class="h-14 w-full flex items-center justify-center mb-2 overflow-hidden bg-slate-900 rounded border border-slate-800">
                            <img src="${sponsor.logo_url || '/images/logo.png'}" class="h-full w-full object-contain opacity-50 group-hover:opacity-100 transition-all">
                        </div>
                        <p class="text-[10px] font-black text-slate-300 truncate text-center">${sponsor.sponsor_name}</p>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error("Gagal load Master Bank:", err); }
}

window.hapusMasterSponsor = async function(id, nama, event) {
    event.stopPropagation();
    if(!confirm(`PERHATIAN: Menghapus dari Master Bank tidak akan mencabut iklan yang sudah tayang di event.\n\nYakin hapus ${nama}?`)) return;
    try {
        const { error } = await supabaseClient.from('master_sponsors').delete().eq('id', id);
        if (error) throw error;
        loadMasterBank(); 
    } catch (err) { alert("Gagal menghapus: " + err.message); }
};

window.useMasterSponsor = function(encodedData) {
    if (!currentSelectedEventId) {
        alert("Pilih Target Event di tabel atas terlebih dahulu!");
        return;
    }
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
    } else {
        previewLogo.src = '';
        previewLogo.classList.add('hidden');
    }
    
    const previewCover = document.getElementById('previewCover');
    if (reusedCoverUrl) {
        previewCover.src = reusedCoverUrl;
        previewCover.classList.remove('hidden');
    } else {
        previewCover.src = '';
        previewCover.classList.add('hidden');
    }

    document.getElementById('adsWorkspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.classList.remove('hidden');
    statusMsg.innerHTML = `✅ Form diisi dengan <b>${sponsor.sponsor_name}</b>. Klik tombol SUNTIKKAN di bawah!`;
    statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-emerald-900/30 text-emerald-400 block mt-4 border border-emerald-500/30";
};

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

async function uploadAdAsset(file, brandName, type) {
    const fileExt = file.name.split('.').pop();
    const fileName = `brand_${brandName.replace(/\s+/g, '_')}_${type}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('sponsor-ads').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabaseClient.storage.from('sponsor-ads').getPublicUrl(fileName);
    return urlData.publicUrl;
}

document.getElementById('btnSaveAds').addEventListener('click', async () => {
    if (!currentSelectedEventId) return alert("Pilih event dari tabel dulu!");

    const valName = document.getElementById('inputSponsorName').value.trim();
    const valLink = document.getElementById('inputSponsorUrl').value.trim();
    const fileLogo = document.getElementById('uploadLogo').files[0];
    const fileCover = document.getElementById('uploadCover').files[0];

    if (!valName) return alert("Nama sponsor wajib diisi!");

    const btn = document.getElementById('btnSaveAds');
    const statusMsg = document.getElementById('statusMsg');

    btn.innerHTML = "⏳ MENGUNGGAH & MENYUNTIK...";
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    statusMsg.classList.remove('hidden');
    statusMsg.innerText = "Memproses aset...";
    statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-amber-900/30 text-amber-400 block mt-4 border border-amber-500/30";

    try {
        let finalLogoUrl = reusedLogoUrl || '';
        let finalCoverUrl = reusedCoverUrl || '';

        if (fileLogo) finalLogoUrl = await uploadAdAsset(fileLogo, valName, 'logo');
        if (fileCover) finalCoverUrl = await uploadAdAsset(fileCover, valName, 'cover');

        // 1. Cek atau Bikin di Master Bank
        let insertedMasterId = null;
        let existingSponsor = masterSponsors.find(s => s.sponsor_name.toLowerCase() === valName.toLowerCase());

        if (existingSponsor) {
            let updateData = { link_url: valLink };
            if (fileLogo) updateData.logo_url = finalLogoUrl;
            if (fileCover) updateData.cover_url = finalCoverUrl;

            await supabaseClient.from('master_sponsors').update(updateData).eq('id', existingSponsor.id);
            insertedMasterId = existingSponsor.id;
        } else {
            const { data: newSponsor, error: insertErr } = await supabaseClient.from('master_sponsors').insert([{
                sponsor_name: valName, link_url: valLink, logo_url: finalLogoUrl, cover_url: finalCoverUrl
            }]).select().single();

            if (insertErr) throw insertErr;
            insertedMasterId = newSponsor.id;
        }

        // 2. Hubungkan ke event_sponsors
        const { data: linkData } = await supabaseClient.from('event_sponsors').select('*').eq('event_id', currentSelectedEventId).single();

        let newCount = 0;
        if (linkData) {
            let currentIds = linkData.sponsor_ids || [];
            if (!currentIds.includes(insertedMasterId)) {
                currentIds.push(insertedMasterId);
                await supabaseClient.from('event_sponsors').update({ sponsor_ids: currentIds }).eq('id', linkData.id);
            }
            newCount = currentIds.length;
        } else {
            await supabaseClient.from('event_sponsors').insert([{
                event_id: currentSelectedEventId,
                sponsor_ids: [insertedMasterId]
            }]);
            newCount = 1;
        }

        // 3. Refresh UI
        await loadMasterBank(); 
        
        const eventIndex = eventsData.findIndex(ev => ev.id == currentSelectedEventId);
        if (eventIndex !== -1) eventsData[eventIndex].sponsor_count = newCount;
        
        renderActiveSponsors();
        renderEventTable();

        statusMsg.innerText = "✅ BOOM! Sponsor berhasil ditambahkan ke Event!";
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-emerald-900/30 text-emerald-400 block mt-4 border border-emerald-500/30";

        // Reset input form
        document.getElementById('inputSponsorName').value = '';
        document.getElementById('inputSponsorUrl').value = '';
        document.getElementById('previewLogo').classList.add('hidden');
        document.getElementById('previewCover').classList.add('hidden');
        reusedLogoUrl = null;
        reusedCoverUrl = null;

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "❌ Error: " + err.message;
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-900/30 text-red-400 block mt-4 border border-red-500/30";
    } finally {
        btn.innerHTML = "🚀 TAMBAHKAN SPONSOR KE EVENT";
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});
