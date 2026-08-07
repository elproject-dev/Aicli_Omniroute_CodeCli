# 🤝 Panduan Kontribusi (Contributing to AICLI)

Terima kasih telah meluangkan waktu untuk berkontribusi pada **AICLI**! 🎉

Project ini *open-source* dan kami sangat terbuka terhadap berbagai bentuk kontribusi, mulai dari perbaikan bug, penambahan fitur baru, perbaikan dokumentasi, hingga diskusi terkait arsitektur project.

Dokumen ini adalah panduan dasar bagi Anda agar kontribusi dapat berjalan lancar dan mudah diintegrasikan.

---

## 🛠️ Bagaimana Saya Bisa Berkontribusi?

### 1. Melaporkan Bug 🐛
Jika Anda menemukan bug, silakan buat *Issue* baru di repositori GitHub kami. Pastikan Anda menyertakan informasi berikut:
- **Versi Node.js** dan **Sistem Operasi** Anda.
- Langkah-langkah detail untuk mereproduksi bug (langkah demi langkah).
- Harapan Anda (apa yang seharusnya terjadi) dan Hasil Aktual (apa yang sebenarnya terjadi).
- Screenshot, log error, atau rekaman layar (jika relevan).

### 2. Meminta Fitur Baru 💡
Mempunyai ide cemerlang untuk membuat AICLI lebih sakti? Kami sangat ingin mendengarnya!
Buatlah *Issue* baru dengan label `enhancement` atau `feature-request`, dan jelaskan:
- Apa masalah yang diselesaikan dengan fitur ini?
- Bagaimana kira-kira alur penggunaannya?
- Referensi dari *tools* serupa jika ada.

### 3. Kontribusi Kode (Pull Requests) 💻

Kami sangat menghargai *Pull Request* (PR)! Silakan ikuti langkah-langkah di bawah ini untuk memulai:

1. **Fork Repositori**: Klik tombol `Fork` di sudut kanan atas halaman repositori ini.
2. **Clone Fork Anda**:
   ```bash
   git clone https://github.com/<username-anda>/Aicli_Omniroute_CodeCli.git
   cd Aicli_Omniroute_CodeCli
   ```
3. **Install Dependensi**:
   ```bash
   npm install
   ```
4. **Buat Branch Baru**:
   Buat branch baru dari `main` dengan nama yang deskriptif. Gunakan format konvensi seperti `feature/nama-fitur` atau `bugfix/nama-bug`.
   ```bash
   git checkout -b feature/tambah-tema-gelap
   ```
5. **Lakukan Perubahan**: Implementasikan perbaikan atau fitur Anda. Pastikan kode Anda rapi dan mengikuti struktur yang sudah ada.
6. **Testing & Linting**:
   Sebelum commit, jalankan linter dan compiler untuk memastikan tidak ada error.
   ```bash
   npm run build
   npm run lint
   ```
7. **Commit Perubahan Anda**:
   Gunakan pesan commit yang jelas. Sangat direkomendasikan menggunakan *Conventional Commits* (misal: `feat: add new theme`, `fix: parsing markdown error`).
8. **Push ke Fork Anda**:
   ```bash
   git push origin feature/tambah-tema-gelap
   ```
9. **Buat Pull Request**: Buka repositori utama AICLI di GitHub dan klik tombol `Compare & pull request`. Jelaskan secara detail apa yang telah Anda ubah.

---

## 📐 Standar Penulisan Kode (Coding Guidelines)

- **TypeScript Strict Mode**: Project ini dibuat menggunakan TypeScript dengan aturan strict. Hindari penggunaan tipe `any` kecuali benar-benar diperlukan.
- **Asynchronous Programming**: Gunakan `async`/`await` daripada Promises berbasis `.then()`.
- **Pewarnaan Terminal**: Gunakan `picocolors` untuk memberikan warna pada output CLI, usahakan desain UI sejalan dengan tema di `src/ui.ts`.
- **Komentar**: Jelaskan fungsi logika yang kompleks (terutama dalam parsing stream dan pengelolaan kursor di terminal).

---

## 🫂 Code of Conduct

Untuk memastikan ruang yang nyaman bagi seluruh kalangan komunitas, kami memegang teguh pedoman perilaku komunitas *open-source*.
- Bersikap sopan dan profesional dalam setiap interaksi (*Issue*, *Pull Request*, maupun diskusi).
- Terima masukan (review kode) secara terbuka.
- Tidak mentoleransi pelecehan atau bahasa yang menyinggung pihak mana pun.

---

Sekali lagi, terima kasih atas niat baik Anda untuk membantu membangun dan meningkatkan **AICLI**.
*Happy Coding!* 🚀
