import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Cek Sesi Aktif
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = '/dashboard.html';
        return;
    }

    // Element Mapping
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    const clubInputGroup = document.getElementById('clubInputGroup');
    const clubNameInput = document.getElementById('clubName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const tncGroup = document.getElementById('tncGroup');
    const promoConsent = document.getElementById('promoConsent');
    const forgotPasswordContainer = document.getElementById('forgotPasswordContainer');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
    const messageBox = document.getElementById('messageBox');
    const mainBtn = document.getElementById('mainBtn');
    const toggleText = document.getElementById('toggleText');
    const toggleBtn = document.getElementById('toggleBtn');
    
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    let isLoginMode = true; // Default: Mode Masuk

    // --- A. TOGGLE PASSWORD VISIBILITY ---
    togglePassword.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePassword.innerText = '🙈';
        } else {
            passwordInput.type = 'password';
            togglePassword.innerText = '👁️';
        }
    });

    toggleConfirmPassword.addEventListener('click', () => {
        if (confirmPasswordInput.type === 'password') {
            confirmPasswordInput.type = 'text';
            toggleConfirmPassword.innerText = '🙈';
        } else {
            confirmPasswordInput.type = 'password';
            toggleConfirmPassword.innerText = '👁️';
        }
    });

    // --- B. TOGGLE MODE (LOGIN <-> REGISTER) ---
    toggleBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        messageBox.classList.add('hidden');

        if (isLoginMode) {
            // Mode Login
            formTitle.innerText = "Masuk ke Portal";
            formSubtitle.innerText = "Sistem Manajemen Kompetisi Akuatik";
            clubInputGroup.classList.add('hidden');
            confirmPasswordGroup.classList.add('hidden');
            tncGroup.classList.add('hidden');
            forgotPasswordContainer.classList.remove('hidden');
            mainBtn.innerText = "Masuk ke Dashboard";
            toggleText.innerText = "Belum bermitra dengan kami?";
            toggleBtn.innerText = "Daftar sekarang";
        } else {
            // Mode Daftar
            formTitle.innerText = "Pendaftaran Klub Baru";
            formSubtitle.innerText = "Bergabunglah dengan ekosistem SCS";
            clubInputGroup.classList.remove('hidden');
            confirmPasswordGroup.classList.remove('hidden');
            tncGroup.classList.remove('hidden');
            forgotPasswordContainer.classList.add('hidden');
            mainBtn.innerText = "Daftar Akun Sekarang";
            toggleText.innerText = "Sudah punya akun?";
            toggleBtn.innerText = "Masuk di sini";
        }
    });

    // --- C. LOGIC UTAMA (SUBMIT FORM) ---
    mainBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        messageBox.classList.add('hidden');

        if (!email || !password) {
            showError("Email dan Kata Sandi wajib diisi!");
            return;
        }

        mainBtn.innerText = "Memproses...";
        mainBtn.disabled = true;
        mainBtn.classList.add('opacity-70');

        if (isLoginMode) {
            // --- PROSES LOGIN ---
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                showError(error.message);
                resetBtn("Masuk ke Dashboard");
            } else {
                showSuccess("Berhasil masuk! Mengalihkan...");
                setTimeout(() => window.location.href = '/dashboard.html', 800);
            }

        } else {
            // --- PROSES REGISTER / PENDAFTARAN ---
            const clubName = clubNameInput.value.trim();
            const confirmPassword = confirmPasswordInput.value;

            if (!clubName) {
                showError("Nama Klub wajib diisi!");
                resetBtn("Daftar Akun Sekarang");
                return;
            }
            if (password !== confirmPassword) {
                showError("Konfirmasi kata sandi tidak cocok!");
                resetBtn("Daftar Akun Sekarang");
                return;
            }
            if (!promoConsent.checked) {
                showError("Anda harus menyetujui Syarat & Ketentuan.");
                resetBtn("Daftar Akun Sekarang");
                return;
            }

            // 1. Daftarkan User ke Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

            if (authError) {
                showError(authError.message);
                resetBtn("Daftar Akun Sekarang");
                return;
            }

            const userId = authData.user?.id;

            if (userId) {
                // 2. Buat record klub baru di tabel 'clubs' dan sambungkan owner_id-nya!
                const shortCode = clubName.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase();
                
                const { error: clubError } = await supabaseClient
                    .from('clubs')
                    .insert([{
                        club_name: clubName,
                        short_name: shortCode,
                        owner_id: userId,
                        tier: 'Basic',
                        is_verified: false
                    }]);

                if (clubError) {
                    console.error("Gagal buat klub:", clubError.message);
                }
            }

            showSuccess("Pendaftaran Berhasil! Silakan masuk.");
            setTimeout(() => {
                toggleBtn.click(); // Balikin ke mode login
                resetBtn("Masuk ke Dashboard");
                emailInput.value = '';
                passwordInput.value = '';
            }, 1500);
        }
    });

    // --- D. LUPA PASSWORD LINK ---
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) {
            alert("Silakan masukkan email Anda terlebih dahulu pada kolom Email.");
            return;
        }

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) {
            alert("Gagal mengirim instruksi reset: " + error.message);
        } else {
            alert("Link pemulihan kata sandi telah dikirim ke email Anda.");
        }
    });

    // Helpers UI
    function showError(msg) {
        messageBox.innerText = `Gagal: ${msg}`;
        messageBox.className = "text-sm font-bold text-center rounded-lg p-3 bg-red-100 text-red-600 block";
    }

    function showSuccess(msg) {
        messageBox.innerText = msg;
        messageBox.className = "text-sm font-bold text-center rounded-lg p-3 bg-green-100 text-green-600 block";
    }

    function resetBtn(text) {
        mainBtn.innerText = text;
        mainBtn.disabled = false;
        mainBtn.classList.remove('opacity-70');
    }
});
