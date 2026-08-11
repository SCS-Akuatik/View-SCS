import { supabaseClient } from './supabase.js';

let reusedLogoUrl = null;
let reusedCoverUrl = null;

document.addEventListener('DOMContentLoaded', async () => {

    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) return window.location.replace('/auth.html');
if (sessionStorage.getItem('aztec_key') !== 'buka_sesame') {
        document.body.innerHTML = `
            <div style="height:100vh;width:100vw;display:flex;flex-direction:column;align-items:center;justify-content:center;background-color:#0f172a;color:#a78bfa;font-family:sans-serif;text-align:center;position:fixed;top:0;left:0;z-index:999999;">
                <span style="font-size:6rem;margin-bottom:20px;">🫣</span>
                <h1 style="font-size:3rem;font-weight:900;text-transform:uppercase;">Waduh... Maksa dong 🤣</h1>
            </div>`;
        setTimeout(() => window.location.replace('/dashboard.html'), 2500);
        return;
    }
    } catch (authErr) {
        return window.location.replace('/auth.html');
    }

    loadGallery();
    setupModalListeners();
});

async function loadGallery() {
    const grid = document.getElementById('sponsorGrid');
    const loading = document.getElementById('loadingState');

    try {
        const { data, error } = await supabaseClient
            .from('master_sponsors')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        loading.classList.add('hidden');
        grid.classList.remove('hidden');

        if (!data || data.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-10"><p class="text-slate-500 font-bold">Database Master Sponsor masih kosong.</p></div>`;
            return;
        }

        let htmlContent = '';
        data.forEach(sponsor => {
            const logo = sponsor.logo_url || '/images/logo.png';
            const link = sponsor.link_url || '#';
            const coverBadge = sponsor.cover_url 
                ? `<span class="bg-emerald-900/50 text-emerald-400 text-[9px] px-2 py-0.5 rounded border border-emerald-500/30 uppercase font-black tracking-wider">A4 Ready</span>` 
                : `<span class="bg-slate-800 text-slate-500 text-[9px] px-2 py-0.5 rounded border border-slate-700 uppercase font-black tracking-wider">No Cover</span>`;
            
            const sponsorDataString = encodeURIComponent(JSON.stringify(sponsor));

            htmlContent += `
                <div onclick="openEditModal('${sponsorDataString}')" class="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 shadow-lg hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all group flex flex-col cursor-pointer relative overflow-hidden">
                    
                    <div class="absolute top-2 right-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </div>

                    <div class="h-28 w-full bg-white rounded-xl mb-4 flex items-center justify-center p-2 relative overflow-hidden border border-slate-600">
                        <img src="${logo}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300">
                    </div>
                    
                    <div class="flex-1">
                        <h3 class="font-black text-white text-sm truncate mb-1">${sponsor.sponsor_name}</h3>
                        <p class="text-[10px] text-blue-400 font-mono truncate block mb-4">${link !== '#' ? link : 'Tidak ada URL'}</p>
                    </div>
                    
                    <div class="flex justify-between items-center border-t border-slate-700/50 pt-3 mt-auto">
                        ${coverBadge}
                        <span class="text-[9px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">ID: ${sponsor.id}</span>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = htmlContent;

    } catch (err) {
        console.error(err);
        loading.innerHTML = `<span class="text-4xl block mb-4">❌</span><p class="text-red-500 font-bold uppercase text-sm">Error: ${err.message}</p>`;
        loading.classList.remove('animate-pulse');
    }
}

// ==========================================
// FUNGSI MODAL & UPDATE
// ==========================================
window.openEditModal = function(encodedData) {
    const sponsor = JSON.parse(decodeURIComponent(encodedData));
    document.getElementById('editSponsorId').value = sponsor.id;
    document.getElementById('editSponsorName').value = sponsor.sponsor_name || '';
    document.getElementById('editSponsorUrl').value = sponsor.link_url || '';
    
    reusedLogoUrl = sponsor.logo_url || null;
    reusedCoverUrl = sponsor.cover_url || null;
    
    document.getElementById('editUploadLogo').value = '';
    document.getElementById('editUploadCover').value = '';
    
    const previewLogo = document.getElementById('editPreviewLogo');
    if (reusedLogoUrl) {
        previewLogo.src = reusedLogoUrl;
        previewLogo.classList.remove('hidden');
    } else {
        previewLogo.classList.add('hidden');
    }

    const previewCover = document.getElementById('editPreviewCover');
    if (reusedCoverUrl) {
        previewCover.src = reusedCoverUrl;
        previewCover.classList.remove('hidden');
    } else {
        previewCover.classList.add('hidden');
    }

    document.getElementById('editStatusMsg').classList.add('hidden');
    document.getElementById('modalEditSponsor').classList.remove('hidden');
}

async function uploadAdAsset(file, brandName, type) {
    const fileExt = file.name.split('.').pop();
    const fileName = `brand_${brandName.replace(/\s+/g, '_')}_${type}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('sponsor-ads').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabaseClient.storage.from('sponsor-ads').getPublicUrl(fileName);
    return urlData.publicUrl;
}

function setupModalListeners() {
    document.getElementById('btnCloseModal').addEventListener('click', () => {
        document.getElementById('modalEditSponsor').classList.add('hidden');
    });

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
                }
                reader.readAsDataURL(file);
            }
        });
    }
    setupPreview('editUploadLogo', 'editPreviewLogo', 'logo');
    setupPreview('editUploadCover', 'editPreviewCover', 'cover');

    document.getElementById('btnSaveSponsor').addEventListener('click', async () => {
        const id = document.getElementById('editSponsorId').value;
        const name = document.getElementById('editSponsorName').value.trim();
        const url = document.getElementById('editSponsorUrl').value.trim();
        const fileLogo = document.getElementById('editUploadLogo').files[0];
        const fileCover = document.getElementById('editUploadCover').files[0];

        if (!name) return alert("Nama Sponsor wajib diisi!");

        const btn = document.getElementById('btnSaveSponsor');
        const statusMsg = document.getElementById('editStatusMsg');

        btn.innerHTML = "⏳ MENYIMPAN...";
        btn.disabled = true;
        statusMsg.classList.remove('hidden');
        statusMsg.innerText = "Memproses aset...";
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-amber-900/30 text-amber-400 block mt-4 border border-amber-500/30";

        try {
            let finalLogoUrl = reusedLogoUrl || '';
            let finalCoverUrl = reusedCoverUrl || '';

            if (fileLogo) finalLogoUrl = await uploadAdAsset(fileLogo, name, 'logo');
            if (fileCover) finalCoverUrl = await uploadAdAsset(fileCover, name, 'cover');

            const updateData = { sponsor_name: name, link_url: url, logo_url: finalLogoUrl, cover_url: finalCoverUrl };

            const { error } = await supabaseClient.from('master_sponsors').update(updateData).eq('id', id);
            if (error) throw error;

            statusMsg.innerText = "✅ Perubahan berhasil disimpan!";
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-emerald-900/30 text-emerald-400 block mt-4 border border-emerald-500/30";

            loadGallery();
            
            setTimeout(() => {
                document.getElementById('modalEditSponsor').classList.add('hidden');
                btn.innerHTML = "💾 SIMPAN PERUBAHAN";
                btn.disabled = false;
            }, 1000);

        } catch (err) {
            statusMsg.innerText = "❌ Error: " + err.message;
            statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-900/30 text-red-400 block mt-4 border border-red-500/30";
            btn.innerHTML = "💾 SIMPAN PERUBAHAN";
            btn.disabled = false;
        }
    });

    document.getElementById('btnDeleteSponsor').addEventListener('click', async () => {
        const id = document.getElementById('editSponsorId').value;
        const name = document.getElementById('editSponsorName').value;
        
        if(!confirm(`PERHATIAN: Yakin hapus ${name} secara permanen?`)) return;
        
        const btn = document.getElementById('btnDeleteSponsor');
        btn.innerHTML = "⏳...";
        btn.disabled = true;

        try {
            const { error } = await supabaseClient.from('master_sponsors').delete().eq('id', id);
            if (error) throw error;
            
            document.getElementById('modalEditSponsor').classList.add('hidden');
            loadGallery();
        } catch (err) { alert("Gagal menghapus: " + err.message); } 
        finally {
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Hapus`;
            btn.disabled = false;
        }
    });
}
