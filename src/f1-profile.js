import { supabaseClient } from './supabase.js';

let currentF1Id = null;
let chartInstance = null; 
let currentAthleteData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. AUTO CAPTURE F1 ID DARI URL PARAMETER
    const urlParams = new URLSearchParams(window.location.search);
    currentF1Id = urlParams.get('id');

    // 2. SAFETY CHECK
    if (!currentF1Id) {
        document.getElementById('f1Name').innerText = "Akses Tidak Valid";
        alert("F1 ID tidak terdeteksi! Silakan buka profil melalui tombol di Dashboard Klub.");
        return;
    }

    await loadAthleteProfile();
    setupModalLogic();
});

async function loadAthleteProfile() {
    try {
        const { data: atlet, error } = await supabaseClient
            .from('athletes')
            .select(`*, clubs(club_name)`) 
            .eq('f1_id', currentF1Id)
            .single();

        if (error || !atlet) throw error;
        
        currentAthleteData = atlet; 

        // Suntik data ke DOM HTML
        document.getElementById('f1IdBadge').innerHTML = `<span>🌊</span> ${atlet.f1_id}`;
        document.getElementById('f1Name').innerText = atlet.full_name;
        document.getElementById('f1Gender').innerText = atlet.gender;
        
        let clubName = "Independent";
        if (atlet.clubs && atlet.clubs.club_name) clubName = atlet.clubs.club_name;
        document.getElementById('f1Club').innerText = clubName;

        const avatarUrl = atlet.foto_url ? atlet.foto_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(atlet.full_name)}&background=fff&color=1e3a8a&size=128&bold=true`;
        document.getElementById('f1Avatar').src = avatarUrl;

        // BEDAH JSONB HISTORY LOMBA
        const history = atlet.history_lomba || []; 
        
        let totalEvent = history.length;
        let totalMedal = 0;
        let personalBest = 9999; 
        
        let chartLabels = [];
        let chartData = [];

        if (totalEvent > 0) {
            history.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

            history.forEach(lomba => {
                if (lomba.medali && lomba.medali.trim() !== '') {
                    totalMedal++;
                }

                if (lomba.waktu_detik && lomba.waktu_detik < personalBest) {
                    personalBest = lomba.waktu_detik;
                }

                const tahun = new Date(lomba.tanggal).getFullYear();
                const labelStatus = lomba.verified_scs ? '✓' : '⚠';
                chartLabels.push(`${labelStatus} ${lomba.nama_event.substring(0, 10)}...`);
                chartData.push(lomba.waktu_detik);
            });
        }

        document.getElementById('statTotalEvent').innerText = totalEvent;
        document.getElementById('statTotalMedal').innerText = totalMedal;
        
        if (personalBest !== 9999) {
            document.getElementById('pbTime').innerText = personalBest.toFixed(2) + "s";
        } else {
            document.getElementById('pbTime').innerText = "NT"; 
        }

        renderDynamicChart(chartLabels, chartData);

    } catch (err) {
        console.error("Gagal memuat profil:", err);
        document.getElementById('f1Name').innerText = "Atlet Tidak Ditemukan";
    }
}

function renderDynamicChart(labels, dataWaktu) {
    const ctx = document.getElementById('progressChart');
    if(!ctx) return;
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    if (labels.length === 0) {
        labels = ['Belum Ada Data'];
        dataWaktu = [0];
    }
    
    let gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(30, 58, 138, 0.5)');
    gradient.addColorStop(1, 'rgba(30, 58, 138, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Waktu (Detik)',
                data: dataWaktu, 
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
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });
}

// LOGIKA MODAL TAMBAH DATA JSONB
function setupModalLogic() {
    const modal = document.getElementById('modalRiwayat');
    const btnBuka = document.getElementById('btnBukaModal');
    const btnTutup = document.getElementById('btnTutupModal');
    const btnSimpan = document.getElementById('btnSimpanRiwayat');
    const alertModal = document.getElementById('alertModal');

    if(btnBuka) btnBuka.addEventListener('click', () => modal.classList.remove('hidden'));
    if(btnTutup) btnTutup.addEventListener('click', () => {
        modal.classList.add('hidden');
        alertModal.classList.add('hidden');
    });

    if(btnSimpan) btnSimpan.addEventListener('click', async () => {
        const inputNama = document.getElementById('inputNamaEvent').value;
        const inputTanggal = document.getElementById('inputTanggal').value;
        const inputGaya = document.getElementById('inputGaya').value;
        const inputWaktu = document.getElementById('inputWaktu').value;
        const inputMedali = document.getElementById('inputMedali').value;

        if (!inputNama || !inputTanggal || !inputGaya || !inputWaktu) {
            alertModal.innerText = "❌ Nama, Tanggal, Gaya, dan Waktu wajib diisi!";
            alertModal.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center block mt-4";
            return;
        }

        btnSimpan.innerHTML = "Menyimpan...";
        btnSimpan.disabled = true;

        try {
            const oldHistory = currentAthleteData.history_lomba || [];

            const newRecord = {
                event_id: "MANUAL-" + Date.now(),
                nama_event: inputNama,
                tanggal: inputTanggal,
                gaya: inputGaya,
                waktu_detik: parseFloat(inputWaktu),
                medali: inputMedali,
                verified_scs: false // HARGA MATI: Input manual = Unverified
            };

            const updatedHistory = [...oldHistory, newRecord];

            const { error } = await supabaseClient
                .from('athletes')
                .update({ history_lomba: updatedHistory })
                .eq('f1_id', currentF1Id);

            if (error) throw error;

            modal.classList.add('hidden');
            document.getElementById('formRiwayat').reset();
            alertModal.classList.add('hidden');
            
            await loadAthleteProfile(); 

        } catch (error) {
            alertModal.innerText = "❌ Gagal menyimpan: " + error.message;
            alertModal.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center block mt-4";
        } finally {
            btnSimpan.innerHTML = "Simpan Data";
            btnSimpan.disabled = false;
        }
    });
}
