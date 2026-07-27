import { supabaseClient } from './supabase.js';

let currentEventId = null;
let eventConfigData = {}; // Menyimpan JSONB dari Supabase

async function loadEventDashboard() {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('id');

    if (!currentEventId) {
        alert("ID Event tidak ditemukan! Mengembalikan ke Dashboard Utama.");
        window.location.replace('/dashboard.html');
        return;
    }

    try {
        const { data: eventData, error } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', currentEventId)
            .single();

        if (error || !eventData) throw error;

        // Ambil config JSONB (kalau null, kasih object kosong)
        eventConfigData = eventData.config || {};

        // Update Text Header
        document.getElementById('headerEventName').innerText = eventData.event_name;
        document.getElementById('headerSubdomain').innerText = `${eventData.subdomain}.funswimming.my.id`;

        // Update Link Input & Fitur Copy
        const publicLink = `https://${eventData.subdomain}.funswimming.my.id`;
        const linkInput = document.getElementById('publicLinkInput');
        if (linkInput) linkInput.value = publicLink;

        const btnCopyLink = document.getElementById('btnCopyLink');
        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', () => {
                linkInput.select();
                document.execCommand('copy'); 
                const originalText = btnCopyLink.innerText;
                btnCopyLink.innerText = "Tersalin!";
                btnCopyLink.classList.replace('bg-blue-600', 'bg-green-500');
                setTimeout(() => {
                    btnCopyLink.innerText = originalText;
                    btnCopyLink.classList.replace('bg-green-500', 'bg-blue-600');
                }, 2000);
            });
        }

        // --- MENGHIDUPKAN NAVIGASI HALAMAN LAIN ---
        // 1. Settings Lomba
        document.getElementById('btnSettingsLomba').onclick = () => {
            window.location.href = `/settings_lomba.html?id=${currentEventId}`;
        };
        // 2. Live Result
        document.getElementById('btnLiveResult').onclick = () => {
            window.location.href = `/live-result.html?id=${currentEventId}`;
        };
        // 3. Nomor Start
        document.getElementById('btnNomorStart').onclick = () => {
            window.location.href = `/nomor-start.html?id=${currentEventId}`;
        };
        // 4. Data Peserta
        document.getElementById('btnDataPeserta').onclick = () => {
            window.location.href = `/event-peserta.html?id=${currentEventId}`;
        };

        // --- CEK STATUS JSONB & UPDATE BADGE UI ---
        updateConfigBadges();

    } catch (err) {
        console.error("Gagal memuat dashboard event:", err);
        alert("Gagal memuat data event.");
    }
}

// Fungsi Update Badge kalau Config sudah terisi
function updateConfigBadges() {
    let completedCount = 0;

    // Cek Landing Page
    if (eventConfigData.landing_text) {
        setCompleteBadge('badgeLanding');
        completedCount++;
    }
    
    // Cek Entry Time
    if (eventConfigData.entry_limit) {
        setCompleteBadge('badgeEntry');
        completedCount++;
    }

    // Cek Tiket
    if (eventConfigData.tiket_harga) {
        setCompleteBadge('badgeTiket');
        completedCount++;
    }

    // Cek Sponsor
    if (eventConfigData.sponsor_name) {
        setCompleteBadge('badgeSponsor');
        completedCount++;
    }

    // Update Progress Bar
    const percent = (completedCount / 4) * 100;
    document.getElementById('statSetup').innerText = `${percent}% Selesai`;
    document.getElementById('barSetup').style.width = `${percent}%`;
}

function setCompleteBadge(elementId) {
    const el = document.getElementById(elementId);
    if(el) {
        el.className = "px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded flex items-center gap-1 border border-emerald-200";
        el.innerHTML = "Selesai";
    }
}

// ===============================================
// LOGIKA MODAL & SIMPAN KE JSONB
// ===============================================

// Logic Buka Modal
document.getElementById('btnConfigLanding').onclick = () => {
    document.getElementById('valLandingText').value = eventConfigData.landing_text || "";
    document.getElementById('modalLanding').classList.remove('hidden');
};
document.getElementById('btnConfigEntry').onclick = () => {
    document.getElementById('valEntryLimit').value = eventConfigData.entry_limit || "";
    document.getElementById('modalEntry').classList.remove('hidden');
};
document.getElementById('btnConfigTiket').onclick = () => {
    document.getElementById('valTiketHarga').value = eventConfigData.tiket_harga || "";
    document.getElementById('valTiketWA').value = eventConfigData.tiket_wa || "";
    document.getElementById('modalTiket').classList.remove('hidden');
};
document.getElementById('btnConfigSponsor').onclick = () => {
    document.getElementById('valSponsorName').value = eventConfigData.sponsor_name || "";
    document.getElementById('modalSponsor').classList.remove('hidden');
};

// Logic Tutup Modal
document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.onclick = (e) => {
        e.target.closest('.fixed').classList.add('hidden');
    }
});

// FUNGSI UTAMA SAVE KE JSONB DATABASE
async function saveConfigToJSONB(key, valueObj, modalId, btnSaveId) {
    const btn = document.getElementById(btnSaveId);
    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    // Gabungkan data lama dengan data baru
    const newConfigData = { ...eventConfigData, ...valueObj };

    try {
        const { error } = await supabaseClient
            .from('events')
            .update({ config: newConfigData })
            .eq('id', currentEventId);

        if (error) throw error;

        // Berhasil! Update memory dan UI
        eventConfigData = newConfigData;
        updateConfigBadges();
        
        document.getElementById(modalId).classList.add('hidden');
        btn.innerText = "Simpan";
        btn.disabled = false;
        
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan pengaturan: " + error.message);
        btn.innerText = "Simpan";
        btn.disabled = false;
    }
}

// Event Listener Simpan per Modal
document.getElementById('btnSaveLanding').onclick = () => {
    saveConfigToJSONB('landing', { landing_text: document.getElementById('valLandingText').value }, 'modalLanding', 'btnSaveLanding');
};
document.getElementById('btnSaveEntry').onclick = () => {
    saveConfigToJSONB('entry', { entry_limit: document.getElementById('valEntryLimit').value }, 'modalEntry', 'btnSaveEntry');
};
document.getElementById('btnSaveTiket').onclick = () => {
    saveConfigToJSONB('tiket', { 
        tiket_harga: document.getElementById('valTiketHarga').value,
        tiket_wa: document.getElementById('valTiketWA').value
    }, 'modalTiket', 'btnSaveTiket');
};
document.getElementById('btnSaveSponsor').onclick = () => {
    saveConfigToJSONB('sponsor', { sponsor_name: document.getElementById('valSponsorName').value }, 'modalSponsor', 'btnSaveSponsor');
};

// Start
loadEventDashboard();
