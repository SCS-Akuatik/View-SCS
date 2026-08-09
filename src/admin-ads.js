import { supabaseClient } from './supabase.js';

let eventsData = [];
let selectedEventConfig = {};

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. GERBANG SATPAM SUPER ADMIN
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError || !session) {
            window.location.replace('/auth.html');
            return;
        }

        // KUNCI MATI: Cuma Radityaraja yang boleh masuk
        if (session.user.email !== 'radityaraja@gmail.com') {
            alert('Akses Ditolak! Ini Area Khusus Super Admin SCS.');
            window.location.replace('/dashboard.html');
            return;
        }

        // 2. LOAD SEMUA EVENT
        const { data, error } = await supabaseClient
            .from('events')
            .select('id, event_name, config')
            .order('created_at', { ascending: false });

        if (error) throw error;
        eventsData = data;

        const selector = document.getElementById('eventSelector');
        selector.innerHTML = '<option value="">-- Pilih Event Lomba --</option>';
        
        eventsData.forEach(ev => {
            selector.innerHTML += `<option value="${ev.id}">${ev.event_name}</option>`;
        });

    } catch (err) {
        alert("Sistem Error: " + err.message);
    }
});

// 3. EVENT LISTENER: SAAT EVENT DIPILIH
document.getElementById('eventSelector').addEventListener('change', (e) => {
    const eventId = e.target.value;
    const workspace = document.getElementById('adsWorkspace');
    
    if (!eventId) {
        workspace.classList.add('hidden');
        return;
    }

    const event = eventsData.find(ev => ev.id == eventId);
    selectedEventConfig = event.config || {};

    // Isi Form dengan data lama jika sudah ada
    document.getElementById('inputSponsorName').value = selectedEventConfig.ads_sponsor_name || '';
    document.getElementById('inputSponsorUrl').value = selectedEventConfig.ads_link_url || '';

    // Render Preview Logo
    const previewLogo = document.getElementById('previewLogo');
    if (selectedEventConfig.ads_sponsor_logo) {
        previewLogo.src = selectedEventConfig.ads_sponsor_logo;
        previewLogo.classList.remove('hidden');
    } else {
        previewLogo.src = '';
        previewLogo.classList.add('hidden');
    }

    // Render Preview Cover
    const previewCover = document.getElementById('previewCover');
    if (selectedEventConfig.ads_cover_a4) {
        previewCover.src = selectedEventConfig.ads_cover_a4;
        previewCover.classList.remove('hidden');
    } else {
        previewCover.src = '';
        previewCover.classList.add('hidden');
    }

    workspace.classList.remove('hidden');
});

// 4. PREVIEW GAMBAR LOKAL SEBELUM UPLOAD
function setupPreview(inputId, imgId) {
    document.getElementById(inputId).addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.getElementById(imgId);
                img.src = event.target.result;
                img.classList.remove('hidden');
            }
            reader.readAsDataURL(file);
        }
    });
}
setupPreview('uploadLogo', 'previewLogo');
setupPreview('uploadCover', 'previewCover');

// 5. TOMBOL SUNTIK (UPLOAD & SAVE KE JSONB)
document.getElementById('btnSaveAds').addEventListener('click', async () => {
    const eventId = document.getElementById('eventSelector').value;
    if (!eventId) return;

    const valName = document.getElementById('inputSponsorName').value.trim();
    const valLink = document.getElementById('inputSponsorUrl').value.trim();
    
    const fileLogo = document.getElementById('uploadLogo').files[0];
    const fileCover = document.getElementById('uploadCover').files[0];

    const btn = document.getElementById('btnSaveAds');
    const statusMsg = document.getElementById('statusMsg');

    btn.innerHTML = "⏳ MENGUNGGAH KE SERVER...";
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    statusMsg.classList.remove('hidden');
    statusMsg.innerText = "Mempersiapkan injeksi...";
    statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-amber-900/30 text-amber-400 block mt-4 border border-amber-500/30";

    try {
        let finalLogoUrl = selectedEventConfig.ads_sponsor_logo || '';
        let finalCoverUrl = selectedEventConfig.ads_cover_a4 || '';

        // Fungsi Helper buat Upload ke bucket 'sponsor-ads'
        const uploadAdAsset = async (file, type) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `event_${eventId}_${type}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage.from('sponsor-ads').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('sponsor-ads').getPublicUrl(fileName);
            return urlData.publicUrl;
        };

        // Mulai Upload Keduanya Jika Ada
        if (fileLogo) {
            statusMsg.innerText = "Mengunggah Logo Sponsor...";
            finalLogoUrl = await uploadAdAsset(fileLogo, 'logo');
        }
        if (fileCover) {
            statusMsg.innerText = "Mengunggah Sampul A4...";
            finalCoverUrl = await uploadAdAsset(fileCover, 'cover');
        }

        // Bikin Konfigurasi JSONB Baru (Digabungin sama config event yang lama)
        const newConfig = {
            ...selectedEventConfig,
            ads_sponsor_name: valName,
            ads_sponsor_logo: finalLogoUrl,
            ads_cover_a4: finalCoverUrl,
            ads_link_url: valLink
        };

        statusMsg.innerText = "Menyimpan ke Database...";

        const { error: updateError } = await supabaseClient
            .from('events')
            .update({ config: newConfig })
            .eq('id', eventId);

        if (updateError) throw updateError;

        // Update local state biar gak perlu refresh halaman
        selectedEventConfig = newConfig;
        const eventIndex = eventsData.findIndex(ev => ev.id == eventId);
        if (eventIndex !== -1) eventsData[eventIndex].config = newConfig;

        statusMsg.innerText = "✅ BOOM! Iklan berhasil disuntikkan ke Event!";
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-emerald-900/30 text-emerald-400 block mt-4 border border-emerald-500/30";

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "❌ Error: " + err.message;
        statusMsg.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-900/30 text-red-400 block mt-4 border border-red-500/30";
    } finally {
        btn.innerHTML = "🚀 SUNTIKKAN IKLAN KE EVENT";
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});
