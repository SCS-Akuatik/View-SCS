document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formKodeAkses');
    const inputKode = document.getElementById('inputKode');
    const sysMsg = document.getElementById('sysMsg');
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    const btnLogout = document.getElementById('btnLogout');

    // Bebas masukin kode apa aja buat tes dummy!
    form.addEventListener('submit', () => {
        const kode = inputKode.value.trim();

        if (!kode) {
            sysMsg.style.color = '#ff003c';
            sysMsg.innerText = '❌ Kode akses tidak boleh kosong, Boss!';
            return;
        }

        // Efek loading ala hacker
        sysMsg.style.color = '#00ff41';
        sysMsg.innerText = 'MEMVERIFIKASI KODE... MEMBUKA AKSES ROOT...';
        
        setTimeout(() => {
            adminLogin.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            typeWriter();
        }, 1200);
    });

    btnLogout.addEventListener('click', () => {
        adminDashboard.classList.add('hidden');
        adminLogin.classList.remove('hidden');
        inputKode.value = '';
        sysMsg.innerText = '';
    });

    function typeWriter() {
        const text = "Akses diterima! Selamat datang kembali di Pusat Kontrol SCS, Boss.";
        const element = document.getElementById('typeMsg');
        element.innerHTML = '';
        let i = 0;

        function typing() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(typing, 30);
            } else {
                element.innerHTML += '<span class="cursor"></span>';
            }
        }
        typing();
    }
});
