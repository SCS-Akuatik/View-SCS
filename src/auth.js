import { supabaseClient } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. CEK SESSION: Lempar ke dashboard kalau udah login
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.replace('/dashboard.html');
        return;
    }

    const containerLogin = document.getElementById('formLoginContainer');
    const containerRegister = document.getElementById('formRegisterContainer');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');

    // ==========================================
    // FUNGSI PENERJEMAH ERROR SUPABASE
    // ==========================================
    function translateAuthError(err) {
        console.error("🔴 RAW ERROR DARI SUPABASE:", err); 
        
        let msg = "";
        if (typeof err === 'string') {
            msg = err;
        } else if (err && typeof err === 'object') {
            msg = err.message || err.error_description || err.msg || err.error || JSON.stringify(err);
        }

        if (!msg || msg === '{}' || msg === '[object Object]') {
            return "Terjadi blokir dari server (Akun sudah ada atau limit request). Coba masuk ke menu Login, atau tunggu 60 detik.";
        }

        const lowerMsg = msg.toLowerCase();
        
        if (lowerMsg.includes("already registered") || lowerMsg.includes("user already exists")) return "Email ini sudah terdaftar. Silakan kembali ke menu Masuk.";
        if (lowerMsg.includes("password should be")) return "Kata sandi terlalu lemah (minimal 6 karakter).";
        if (lowerMsg.includes("invalid login credentials")) return "Email atau kata sandi salah!";
        if (lowerMsg.includes("email not confirmed")) return "Email belum diverifikasi. Cek Kotak Masuk atau folder Spam Anda.";
        if (lowerMsg.includes("rate limit") || lowerMsg.includes("60 seconds") || lowerMsg.includes("too many")) return "Sistem mengamankan akun Anda dari spam. Tunggu 60 detik.";
        if (lowerMsg.includes("fetch") || lowerMsg.includes("network")) return "Koneksi terputus. Pastikan internet Anda stabil.";
        if (lowerMsg.includes("signups not allowed")) return "Pendaftaran ditutup sementara oleh sistem.";
        
        return msg; 
    }

    // ==========================================
    // SWITCHER ANIMASI (LOGIN <-> REGISTER)
    // ==========================================
    document.getElementById('btnSwitchToRegister').addEventListener('click', () => {
        containerLogin.classList.remove('translate-x-0', 'opacity-100');
        containerLogin.classList.add('-translate-x-full', 'opacity-0');
        setTimeout(() => {
            containerLogin.classList.add('hidden');
            containerRegister.classList.remove('hidden');
            containerRegister.classList.add('flex');
            setTimeout(() => {
                containerRegister.classList.remove('translate-x-full', 'opacity-0');
                containerRegister.classList.add('translate-x-0', 'opacity-100');
            }, 50);
        }, 300);
    });

    document.getElementById('btnSwitchToLogin').addEventListener('click', () => {
        containerRegister.classList.remove('translate-x-0', 'opacity-100');
        containerRegister.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            containerRegister.classList.add('hidden');
            containerRegister.classList.remove('flex');
            containerLogin.classList.remove('hidden');
            setTimeout(() => {
                containerLogin.classList.remove('-translate-x-full', 'opacity-0');
                containerLogin.classList.add('translate-x-0', 'opacity-100');
            }, 50);
        }, 300);
    });

    // ==========================================
    // LOGIKA LOGIN GOOGLE
    // ==========================================
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            btnGoogleLogin.innerHTML = `<span class="animate-spin text-xl">↻</span> Menghubungkan...`;
            
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard.html'
                }
            });

            if (error) {
                alert("Gagal menghubungkan ke Google: " + translateAuthError(error));
                btnGoogleLogin.innerHTML = "Lanjutkan dengan Google";
            }
        });
    }

    // ==========================================
    // LOGIKA LOGIN EMAIL
    // ==========================================
    formLogin.addEventListener('submit', async () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorMsg = document.getElementById('loginErrorMsg');

        btnLogin.innerHTML = `<span class="animate-spin text-xl">↻</span> Memproses...`;
        btnLogin.disabled = true;
        errorMsg.classList.add('hidden');

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;
            
            window.location.replace('/dashboard.html');

        } catch (err) {
            console.error("Login Error:", err);
            errorMsg.innerText = "❌ " + translateAuthError(err);
            errorMsg.classList.remove('hidden');
            btnLogin.innerHTML = `Masuk 🚀`;
            btnLogin.disabled = false;
        }
    });

    // ==========================================
    // LOGIKA REGISTER EMAIL (DENGAN VERIFIKASI)
    // ==========================================
    formRegister.addEventListener('submit', async () => {
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value; 
        const alertMsg = document.getElementById('regAlertMsg');

        if (password !== confirmPassword) {
            alertMsg.innerText = "❌ Kata sandi tidak cocok. Silakan periksa kembali!";
            alertMsg.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 text-center block";
            alertMsg.classList.remove('hidden');
            return;
        }

        btnRegister.innerHTML = `<span class="animate-spin text-xl">↻</span> Memproses...`;
        btnRegister.disabled = true;
        alertMsg.classList.add('hidden');

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) throw error;

            if (data?.user && data.user.identities && data.user.identities.length === 0) {
                throw new Error("Email ini sudah terdaftar. Silakan kembali ke menu Masuk.");
            }

            // Pesan dikembalikan seperti semula (Minta User Cek Email)
            alertMsg.innerHTML = "✅ <strong>Pendaftaran Berhasil!</strong><br>Silakan periksa <strong>Kotak Masuk / Spam</strong> email Anda untuk mengklik tautan verifikasi sebelum masuk.";
            alertMsg.className = "bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-lg border border-emerald-200 text-center leading-relaxed block";
            
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regConfirmPassword').value = '';

        } catch (err) {
            console.error("Register Error:", err);
            alertMsg.innerText = "❌ " + translateAuthError(err);
            alertMsg.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 text-center block";
            alertMsg.classList.remove('hidden');
        } finally {
            btnRegister.innerHTML = `Daftarkan Via Email`;
            btnRegister.disabled = false;
        }
    });

    // ==========================================
    // LOGIKA LUPA PASSWORD (MODAL)
    // ==========================================
    const btnLupaSandi = document.getElementById('btnLupaSandi');
    const modalResetPassword = document.getElementById('modalResetPassword');
    const btnTutupReset = document.getElementById('btnTutupReset');
    const btnKirimReset = document.getElementById('btnKirimReset');

    if (btnLupaSandi) {
        btnLupaSandi.addEventListener('click', (e) => {
            e.preventDefault();
            modalResetPassword.classList.remove('hidden');
        });
    }

    if (btnTutupReset) {
        btnTutupReset.addEventListener('click', () => {
            modalResetPassword.classList.add('hidden');
            document.getElementById('resetAlertMsg').classList.add('hidden');
        });
    }

    if (btnKirimReset) {
        btnKirimReset.addEventListener('click', async () => {
            const email = document.getElementById('inputResetEmail').value.trim();
            const alertMsg = document.getElementById('resetAlertMsg');

            if (!email) {
                alertMsg.innerText = "❌ Masukkan email akun Anda terlebih dahulu!";
                alertMsg.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center block mb-4";
                alertMsg.classList.remove('hidden');
                return;
            }

            btnKirimReset.innerHTML = `<span class="animate-spin inline-block">↻</span> Mengirim...`;
            btnKirimReset.disabled = true;
            alertMsg.classList.add('hidden');

            try {
                const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/dashboard.html', 
                });

                if (error) throw error;

                alertMsg.innerHTML = "✅ <strong>Tautan Terkirim!</strong><br>Silakan periksa kotak masuk atau folder spam email Anda.";
                alertMsg.className = "bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-xl border border-emerald-200 text-center block mb-4";
                document.getElementById('inputResetEmail').value = ''; 

            } catch (err) {
                console.error("Reset Password Error:", err);
                alertMsg.innerText = "❌ " + translateAuthError(err);
                alertMsg.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center block mb-4";
                alertMsg.classList.remove('hidden');
            } finally {
                btnKirimReset.innerHTML = "Kirim Tautan";
                btnKirimReset.disabled = false;
            }
        });
    }
});
