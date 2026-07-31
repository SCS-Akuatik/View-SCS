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
    // SWITCHER ANIMASI (LOGIN <-> REGISTER)
    // ==========================================
    document.getElementById('btnSwitchToRegister').addEventListener('click', () => {
        containerLogin.classList.remove('translate-x-0', 'opacity-100');
        containerLogin.classList.add('-translate-x-full', 'opacity-0');
        setTimeout(() => {
            containerLogin.classList.add('hidden');
            containerRegister.classList.remove('hidden');
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
                alert("Gagal menghubungkan ke Google: " + error.message);
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

            if (error) {
                if (error.message.includes("Invalid login credentials")) {
                    throw new Error("Email atau kata sandi salah!");
                } else if (error.message.includes("Email not confirmed")) {
                    throw new Error("Email belum diverifikasi. Cek kotak masuk Anda!");
                }
                throw error;
            }
            
            window.location.replace('/dashboard.html');

        } catch (err) {
            errorMsg.innerText = err.message;
            errorMsg.classList.remove('hidden');
            btnLogin.innerHTML = `Masuk 🚀`;
            btnLogin.disabled = false;
        }
    });

    // ==========================================
    // LOGIKA REGISTER EMAIL
    // ==========================================
    formRegister.addEventListener('submit', async () => {
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const alertMsg = document.getElementById('regAlertMsg');

        btnRegister.innerHTML = `<span class="animate-spin text-xl">↻</span> Memproses...`;
        btnRegister.disabled = true;
        alertMsg.classList.add('hidden');

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                if (error.message.includes("User already registered")) {
                    throw new Error("Email ini sudah digunakan. Silakan login.");
                }
                throw error;
            }

            alertMsg.innerHTML = "✅ <strong>Pendaftaran Berhasil!</strong><br>Silakan periksa <strong>Kotak Masuk / Spam</strong> email Anda untuk mengklik tautan verifikasi sebelum masuk.";
            alertMsg.className = "bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-lg border border-emerald-200 text-center leading-relaxed block";
            
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';

        } catch (err) {
            alertMsg.innerText = "❌ " + err.message;
            alertMsg.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 text-center block";
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
                alertMsg.innerText = "Masukkan email akun Anda terlebih dahulu!";
                alertMsg.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center block mb-4";
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
                alertMsg.innerText = "❌ Gagal: " + err.message;
                alertMsg.className = "bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 text-center block mb-4";
            } finally {
                btnKirimReset.innerHTML = "Kirim Tautan";
                btnKirimReset.disabled = false;
            }
        });
    }
});
