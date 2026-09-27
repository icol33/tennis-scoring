# Rally Board — Tennis Americano

App pencatat skor & ranking tennis (Americano single/double) yang bisa diisi bareng lewat link.
HTML + JavaScript biasa, tanpa build. Data tersimpan di Firebase Firestore dan tersinkron live.

## Isi folder
| File | Fungsi |
|---|---|
| `index.html` | Tampilan & gaya |
| `app.js` | Logika app (jadwal, skor, ranking, sinkron Firestore) |
| `firebase-config.js` | **Wajib diisi** dengan config project Firebase-mu |
| `firestore.rules` | Aturan keamanan Firestore (tempel ke Console) |
| `netlify.toml` | Setting deploy Netlify (tanpa build) |

## 1. Isi config Firebase
1. Firebase Console → ⚙️ **Project settings** → **General** → bagian **Your apps**.
2. Kalau belum ada Web app, klik ikon `</>` untuk menambahkan (Hosting tidak perlu dicentang).
3. Salin objek `firebaseConfig`, lalu tempel nilainya ke `firebase-config.js`.

Selama config masih berisi `GANTI_...`, app otomatis jalan di **mode lokal** (data hanya di browser itu).

## 2. Pasang Firestore rules
Firebase Console → **Firestore Database** → tab **Rules** → hapus isinya, tempel isi `firestore.rules` → **Publish**.

Kalau pakai Firebase CLI: `firebase deploy --only firestore:rules`.

> Catatan: karena tanpa login, siapa pun yang tahu URL app bisa melihat & mengubah semua sesi.
> Rules di atas membatasi bentuk & ukuran data, tapi tidak membedakan orang.

## 3. Coba di komputer (opsional)
File harus dibuka lewat server lokal (bukan klik dua kali `index.html`) karena memakai ES module:

```bash
npx serve .
# lalu buka http://localhost:3000
```

## 4. Push ke GitHub
Buat repo kosong di github.com (tanpa README), lalu di folder ini:

```bash
git init
git add .
git commit -m "Rally Board: tennis americano app"
git branch -M main
git remote add origin https://github.com/USERNAME/tennis-scoring.git
git push -u origin main
```

## 5. Deploy di Netlify
1. app.netlify.com → **Add new site** → **Import an existing project** → **GitHub** → pilih repo `tennis-scoring`.
2. **Build command**: kosongkan. **Publish directory**: `.`
3. **Deploy**. Setiap `git push` berikutnya akan otomatis ter-deploy ulang.

## 6. (Disarankan) Kunci API key ke domain Netlify
Google Cloud Console → **APIs & Services** → **Credentials** → pilih *Browser key* project ini →
**Application restrictions: Websites** → tambahkan `https://NAMA-SITE.netlify.app/*` dan `http://localhost:3000/*`.

## Cara pakai
- **Setup**: nama sesi, tanggal, jumlah court, format Double/Single, daftar pemain (bisa tempel beberapa nama dipisah koma, Enter untuk tambah).
- **Acak pasangan & buat jadwal**: round-robin; double = tiap pemain berpasangan dengan semua pemain lain sekali.
- **Match**: isi skor manual, ganti pemain per slot, tandai "Sedang main".
- **Ranking**: per pemain, W-L-T; menang +2, kalah −2, seri 0; tie-break selisih skor lalu total skor.
- Setiap sesi punya link sendiri (`.../#/s/<id>`), tinggal share ke grup.
