# Sales Monitor (v4)

Dashboard sales minimalis. Ungu pastel = SP Kebayoran, biru = Depo Kapuk. Alur: Depo → Tim (tanpa password).

## Deploy (sama seperti sebelumnya)
1. Push seluruh isi folder ke GitHub (folder `src`, `api`, `scripts` harus ikut sebagai folder).
2. Vercel → Import repo (Vite terdeteksi otomatis).
3. Storage → Create → Blob, lalu **Connect Project** ke project ini (centang Production, Preview, Development). Cek `BLOB_READ_WRITE_TOKEN` ada di Settings → Environment Variables, lalu **Redeploy** (variabel baru hanya terbaca di deployment baru). Kalau muncul "No token found", artinya langkah ini belum selesai.
4. Tidak ada env password. Siapa pun yang punya link bisa buka dan mengubah data, jadi jangan sebar link ke luar tim.
5. Log build harus berisi `[check-files] OK`.

## Upload: 5 slot terpisah (per depo × tim)
| Slot | Isi | Catatan |
|---|---|---|
| Data utama | omset/ACT per toko, Sep, L3M, Pareto JKS, target, hari kunjungan, sheet DAP, sheet TGT | sheet dikenali dari JUDUL: `TGT…` target, `DAP…` DAP, `PARETO…`/`LAB` pareto, `KHUSUS …` menimpa salesman yang tercantum |
| Qty / SKU | baris per toko × SKU: kode/nama SKU, qty, nilai | |
| GreenStore / MSS | target + actual per salesman atau toko | judul sheet `GREENSTORE` / `MSS` menentukan nama program |
| Program (Excel/PDF) | daftar toko peserta program | dicocokkan ke toko di Data utama lewat ID, lalu nama. Hasil bisa dicek dan dikoreksi sebelum disimpan. PDF harus punya teks (bukan scan). Program jadi variabel di Jelajah dan kolom di DAP |
| Database SKU | kode SKU + nama (+ brand/kategori) | per depo, dipakai kedua tim |

Header tabel dicari otomatis (posisi bebas), nama kolom dicocokkan longgar. Kalau meleset: Upload → "Pemetaan kolom".
File format lama (sheet OLAP SALES / JKS SALESMAN / BIMA) masih terbaca di slot Data utama.
Batas simpan per slot 4,3 MB (JSON hasil baca); file Excel maksimal 80 MB di browser.

## Catatan angka
- "Timegone sama" = Sep/L3M × timegone (estimasi proporsional, data Sep & L3M adalah total sebulan).
- Level SKU: Sep/L3M tidak tersedia (datanya per toko). Target di level SKU = target per SKU kalau ada, kalau tidak target principal per salesman (tanda *).

## Fitur lain
- **Musik:** tombol ♪ di header (default mati). Ambient generatif di browser, hangat untuk Kebayoran, jernih untuk Kapuk. Tanpa file audio.
- **Jelajah:** panel kiri berisi scorecard per indikator (angka total ikut filter). Tap atau geret scorecard ke Indikator.
- **DAP / SKU fokus:** SKU diambil dari Database SKU (kode, nama, brand, kategori), qty dan nilai dari slot Qty (dicocokkan lewat kode SKU). Tombol "+ kategori" memasukkan semua SKU di kategori itu; di halaman Fokus Pareto tiap kategori diberi baris total. SKU yang tidak ada di file Qty tampil 0.
