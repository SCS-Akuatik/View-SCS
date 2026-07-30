import { supabaseClient } from './supabase.js';

let currentF1Id = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentF1Id = urlParams.get('id');

    if (!currentF1Id) {
        alert("F1 ID tidak ditemukan!");
        return;
    }

    await loadAthleteProfile();
    initDummyChart(); // Grafik Dummy sementara sampai tabel records dibuat
});

async function loadAthleteProfile() {
    try {
        // 1. Tarik Data Atlet
        const { data: atlet, error } = await supabaseClient
            .from('athletes')
            .select(`*, clubs(club_name)`) // Join untuk ambil nama klub
            .eq('f1_id', currentF1Id)
            .single();

        if (error || !atlet) throw error;

        // 2. Suntik ke HTML
        document.getElementById('f1IdBadge').innerHTML = `<span>🌊</span> ${atlet.f1_id}`;
        document.getElementById('f1Name').innerText = atlet.full_name;
        document.getElementById('f1Gender').innerText = atlet.gender;
        
        // Cek Nama Klub
        let clubName = "Independent";
        if (atlet.clubs && atlet.clubs.club_name) clubName = atlet.clubs.club_name;
        document.getElementById('f1Club').innerText = clubName;

        // Foto Avatar
        const avatarUrl = atlet.foto_url ? atlet.foto_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(atlet.full_name)}&background=fff&color=1e3a8a&size=128&bold=true`;
        document.getElementById('f1Avatar').src = avatarUrl;

    } catch (err) {
        console.error("Gagal memuat profil:", err);
        document.getElementById('f1Name').innerText = "Atlet Tidak Ditemukan";
    }
}

function initDummyChart() {
    const ctx = document.getElementById('progressChart');
    if(!ctx) return;
    
    let gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(30, 58, 138, 0.5)');
    gradient.addColorStop(1, 'rgba(30, 58, 138, 0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan - Sby Cup', 'Mar - Walikota Cup', 'Jul - Sprint', 'Agu - Jago Cup'],
            datasets: [{
                label: 'Waktu (Detik)',
                data: [31.50, 29.80, 27.12, 26.45], 
                borderColor: '#1e3a8a',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { reverse: true, grid: { borderDash: [5, 5] }, ticks: { callback: v => v + 's' } },
                x: { grid: { display: false } }
            }
        }
    });
}
