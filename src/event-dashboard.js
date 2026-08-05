import { supabaseClient } from './supabase.js';

let currentEventId = null;
let eventConfigData = {}; 

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

        if (error || !eventData) throw new Error("Gagal memuat dari database.");

        eventConfigData = eventData.config || {};

        document.getElementById('headerEventName').innerText = eventData.event_name;
        document.getElementById('headerSubdomain').innerText = `${eventData.subdomain}.funswimming.my.id`;

        // ==========================================
        // 1. LINK COPY PENDAFTARAN
        // ==========================================
        const publicLink = `https://${eventData.subdomain}.funswimming.my.id?id=${currentEventId}`;
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

        // ==========================================
        // 2. LINK COPY LIVE RESULT
        // ==========================================
        const publicResultLink = `https://${eventData.subdomain}.funswimming.my.id/result?id=${currentEventId}`;
        const resultLinkInput = document.getElementById('publicResultLinkInput');
        if (resultLinkInput) resultLinkInput.value = publicResultLink;

        const btnCopyResultLink = document.getElementById('btnCopyResultLink');
        if (btnCopyResultLink) {
            btnCopyResultLink.addEventListener('click', () => {
                resultLinkInput.select();
                document.execCommand('copy'); 
                const originalText = btnCopyResultLink.innerText;
                btnCopyResultLink.innerText = "Tersalin!";
                btnCopyResultLink.classList.replace('bg-red-600', 'bg-green-500');
                setTimeout(() => {
                    btnCopyResultLink.innerText = originalText;
                    btnCopyResultLink.classList.replace('bg-green-500', 'bg-red-600');
                }, 2000);
            });
        }

        // --- NAVIGASI HALAMAN PANITIA ---
        document.getElementById('btnSettingsLomba').onclick = () => window.location.href = `/settings-lomba.html?id=${currentEventId}`;
        document.getElementById('btnLiveResult').onclick = () => window.location.href = `/live-result.html?id=${currentEventId}`;
        document.getElementById('btnDataPeserta').onclick = () => window.location.href = `/event-peserta.html?id=${currentEventId}`;

        // --- LOGIKA MODAL PUSAT CETAK ---
        document.getElementById('btnPusatCetak').onclick = () => {
            document.getElementById('modalPusatCetak').classList.remove('hidden');
        };

        document.getElementById('btnCloseCetak').onclick = () => {
            document.getElementById('modalPusatCetak').classList.add('hidden');
        };

        // Navigasi Cetak Buku Acara
        document.getElementById('btnMenuBukuAcara').onclick = () => {
            let lanes = prompt("Berapa jumlah lintasan kolam yang digunakan?", "8");
            if (lanes) {
                window.location.href = `/book/book.html?id=${currentEventId}&lanes=${lanes}`;
            }
        };

        // Navigasi Heat Builder (Drag & Drop)
        document.getElementById('btnMenuHeatBuilder').onclick = () => {
            window.location.href = `/book/heat-builder.html?id=${currentEventId}`;
        };

        // NAVIGASI BARU: Cetak PDF
        document.getElementById('btnMenuCetakPDF').onclick = () => {
            window.location.href = `/book/print-startlist.html?id=${currentEventId}`;
        };

        // Navigasi Cetak Hasil Lomba
        document.getElementById('btnMenuHasilLomba').onclick = () => {
            window.location.href = `/book/event-result.html?id=${currentEventId}`;
        };

        updateConfigBadges();
        await loadEventStats();

    } catch (err) {
        alert("Gagal memuat data event.");
    }
}

// ===============================================
// LOAD STATISTIK
// ===============================================
async function loadEventStats() {
    try {
        const { count: countPeserta, error: errPeserta } = await supabaseClient
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', currentEventId)
            .eq('status_pembayaran', 'Lunas');
        
        if (!errPeserta) document.getElementById('statPeserta').innerText = countPeserta || 0;

        const { data: heatsData, error: errHeats } = await supabaseClient
            .from('event_heats')
            .select('event_number')
            .eq('event_id', currentEventId);

        if (!errHeats && heatsData) {
            document.getElementById('statHeat').innerText = heatsData.length;
            const uniqueEvents = new Set(heatsData.map(h => h.event_number));
            document.getElementById('statKategori').innerText = uniqueEvents.size;
        }
    } catch (error) {
        // Silent catch untuk UX yang lebih bersih
    }
}

function updateConfigBadges() {
    let completedCount = 0;
    if (eventConfigData.landing_text) { setCompleteBadge('badgeLanding'); completedCount++; }
    if (eventConfigData.entry_limit) { setCompleteBadge('badgeEntry'); completedCount++; }
    if (eventConfigData.tiket_harga) { setCompleteBadge('badgeTiket'); completedCount++; }
    if (eventConfigData.sponsor_name) { setCompleteBadge('badgeSponsor'); completedCount++; }

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
// LOGIKA MODAL CONFIG LAINNYA
// ===============================================
document.getElementById('btnConfigLanding').onclick = () => { document.getElementById('valLandingText').value = eventConfigData.landing_text || ""; document.getElementById('modalLanding').classList.remove('hidden'); };
document.getElementById('btnConfigEntry').onclick = () => { document.getElementById('valEntryLimit').value = eventConfigData.entry_limit || ""; document.getElementById('modalEntry').classList.remove('hidden'); };
document.getElementById('btnConfigTiket').onclick = () => { document.getElementById('valTiketHarga').value = eventConfigData.tiket_harga || ""; document.getElementById('valTiketWA').value = eventConfigData.tiket_wa || ""; document.getElementById('modalTiket').classList.remove('hidden'); };
document.getElementById('btnConfigSponsor').onclick = () => { document.getElementById('valSponsorName').value = eventConfigData.sponsor_name || ""; document.getElementById('modalSponsor').classList.remove('hidden'); };

document.querySelectorAll('.btn-close-modal').forEach(btn => btn.onclick = (e) => e.target.closest('.fixed').classList.add('hidden'));

async function saveConfigToJSONB(key, valueObj, modalId, btnSaveId) {
    const btn = document.getElementById(btnSaveId);
    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    const newConfigData = { ...eventConfigData, ...valueObj };

    try {
        const { error } = await supabaseClient.from('events').update({ config: newConfigData }).eq('id', currentEventId);
        if (error) throw error;
        
        eventConfigData = newConfigData;
        updateConfigBadges();
        document.getElementById(modalId).classList.add('hidden');
    } catch (error) {
        alert("Gagal menyimpan: Cek koneksi Anda.");
    } finally {
        btn.innerText = "Simpan";
        btn.disabled = false;
    }
}

document.getElementById('btnSaveLanding').onclick = () => saveConfigToJSONB('landing', { landing_text: document.getElementById('valLandingText').value }, 'modalLanding', 'btnSaveLanding');
document.getElementById('btnSaveEntry').onclick = () => saveConfigToJSONB('entry', { entry_limit: document.getElementById('valEntryLimit').value }, 'modalEntry', 'btnSaveEntry');
document.getElementById('btnSaveTiket').onclick = () => saveConfigToJSONB('tiket', { tiket_harga: document.getElementById('valTiketHarga').value, tiket_wa: document.getElementById('valTiketWA').value }, 'modalTiket', 'btnSaveTiket');
document.getElementById('btnSaveSponsor').onclick = () => saveConfigToJSONB('sponsor', { sponsor_name: document.getElementById('valSponsorName').value }, 'modalSponsor', 'btnSaveSponsor');

loadEventDashboard();
const btnMenuSertifikat = document.getElementById('btnMenuSertifikat');
if (btnMenuSertifikat) {
    btnMenuSertifikat.onclick = () => window.location.href = `/book/event-sertifikat.html?id=${currentEventId}`;
}
