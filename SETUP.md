# Cara pakai portfolio

> **Pembaruan UTS 2026:** Baca `PANDUAN_UTS_2026.md` lebih dulu. Paket ZIP asli ternyata belum berisi `assets/` lama (foto profil, proyek, Moments, dan favicon). Versi ini hanya menambahkan foto drama dalam `assets/drama/`. Tambahkan aset lama sebelum memublikasikan website coding ini.


Website ini dibuat dari blueprint portfolio Ahmad Fahril. HTML, CSS, JS, dan aset gambar disusun dalam satu folder.

## Struktur file

```text
portfolio/
├── index.html
├── css/style.css
├── js/main.js
├── js/background-scene.js
└── assets/
    ├── foto/
    └── favicon_io/
```

Jangan pindah folder `assets/`, `css/`, atau `js/` tanpa mengubah path di HTML. Untuk melihat website, buka `index.html`. Kalau ingin menguji seperti website sungguhan, gunakan **Live Server** dari VS Code atau jalankan `python -m http.server 5500` dari folder ini dan buka `http://localhost:5500`.

## Interaksi yang sudah ada

- Theme switcher: default dark, menyimpan pilihan dengan `localStorage` jika browser mengizinkan.
- Tab gambar proyek: UI, Hardware, Architecture. Keyboard bisa pakai tombol panah.
- Galeri Moments: klik foto untuk memperbesar, tekan Esc untuk menutup.
- Animasi masuk saat scroll, custom cursor untuk desktop, dan background angkasa.
- Background Three.js: bulan/matahari berbentuk 3D, bintang, meteor, dan parallax mouse. Three.js diambil dari CDN jsDelivr ketika ada koneksi internet. Jika tidak dapat dimuat, animasi tetap berjalan memakai Canvas 2D (tampilan objek berbayang, bukan geometri 3D WebGL).
- Saat pengguna memilih `reduced motion`, gerakan dikurangi/dimatikan.

## Form kontak

Form belum mengirim email karena belum ada akses Web3Forms. Email `rilinfo@ahmadfahril.web.id` di bagian Contact tetap dapat diklik. Kalau sudah mempunyai public access key Web3Forms, ubah atribut form di `index.html`:

```html
<form class="contact-form" id="contact-form"
      data-contact-service="web3forms"
      data-access-key="PASTE_PUBLIC_ACCESS_KEY_DI_SINI"
      data-reveal>
```

Pastikan email penerima sudah diatur dan diverifikasi di Web3Forms, lalu lakukan tes pengiriman sendiri. Jangan masukkan password email atau secret API key ke kode frontend. Kalau belum disetel, tombol kirim memang nonaktif supaya tidak memberi kesan pesan berhasil terkirim.

## Hal yang perlu dilengkapi

- Tambahkan CV ke `assets/docs/cv-ahmad-fahril.pdf` sebelum mengaktifkan tombol Download CV.
- Masukkan link GitHub yang benar. Sekarang belum dibuat clickable karena URL-nya belum ada.
- Pastikan foto yang memuat orang lain memang boleh dipublikasikan.
- Tinjau kembali semua kalimat pengalaman dan proyek agar sesuai dengan yang benar-benar dikerjakan.

## Menjelaskan proyek ke dosen

Yang penting bukan mengaku semua kode ditulis tanpa bantuan, tetapi bisa menunjukkan blueprint yang Anda susun, perubahan desain yang Anda pilih, contoh commit/riwayat pengerjaan, dan pemahaman atas kodenya. Jika dosen meminta keterangan penggunaan AI, jelaskan bantuan penulisan dan implementasi secara jujur.
