# Suroboyo Bloods — Design Guidelines

**Kerja sama PMII × Rumah Sakit Surabaya**
Platform donor darah digital untuk Kota Surabaya.

---

## 1. Brand Identity

### Misi
Menghubungkan pendonor, rumah sakit, dan komunitas PMII dalam satu platform yang cepat, terpercaya, dan mudah diakses — menyelamatkan nyawa melalui informasi stok darah yang real-time.

### Kepribadian Brand
- **Cepat** — informasi stok darah harus bisa ditemukan dalam hitungan detik
- **Terpercaya** — tampilan bersih dan profesional seperti layanan medis
- **Komunitas** — hangat, inklusif, digerakkan oleh relawan
- **Lokal** — identitas kuat sebagai platform Surabaya

---

## 2. Color Palette

### Primary Colors

| Token | Hex | Penggunaan |
|-------|-----|-----------|
| `--brand-red` | `#C0392B` | CTA utama, logo, aksen penting |
| `--brand-red-dark` | `#922B21` | Hover state pada tombol merah |
| `--brand-red-light` | `#F1948A` | Background highlight, badge |
| `--brand-red-pale` | `#FDEDEC` | Background section, card subtle |

### Neutral Colors

| Token | Hex | Penggunaan |
|-------|-----|-----------|
| `--neutral-900` | `#1A1A2E` | Heading utama, teks body bold |
| `--neutral-700` | `#4A4A6A` | Teks body reguler |
| `--neutral-400` | `#9B9BB5` | Placeholder, label sekunder |
| `--neutral-100` | `#F4F4F8` | Background page, card default |
| `--neutral-50` | `#FAFAFA` | Surface alt, sidebar |
| `--neutral-white` | `#FFFFFF` | Card surface, modal |

### Status / Functional Colors

| Token | Hex | Kondisi |
|-------|-----|---------|
| `--status-critical` | `#E74C3C` | Stok darah kritis (< 10 kantong) |
| `--status-low` | `#E67E22` | Stok rendah (10–30 kantong) |
| `--status-medium` | `#F1C40F` | Stok sedang (30–50 kantong) |
| `--status-good` | `#27AE60` | Stok cukup (> 50 kantong) |
| `--status-unavailable` | `#95A5A6` | Tidak tersedia |

### Golongan Darah — Warna Kartu

| Golongan | Background | Border |
|----------|-----------|--------|
| A+ / A− | `#FADBD8` | `#E74C3C` |
| B+ / B− | `#D6EAF8` | `#2980B9` |
| AB+ / AB− | `#E8DAEF` | `#8E44AD` |
| O+ / O− | `#D5F5E3` | `#27AE60` |

---

## 3. Typography

### Font Stack

```
Font Utama (Heading): "Plus Jakarta Sans", sans-serif
Font Body:            "Inter", sans-serif
Font Monospace:       "JetBrains Mono", monospace
```

Import Google Fonts (tambahkan ke `src/styles/fonts.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Type Scale

| Role | Font | Size | Weight | Line-height |
|------|------|------|--------|------------|
| Display | Plus Jakarta Sans | 48px / 3rem | 800 | 1.15 |
| H1 | Plus Jakarta Sans | 36px / 2.25rem | 700 | 1.2 |
| H2 | Plus Jakarta Sans | 28px / 1.75rem | 700 | 1.3 |
| H3 | Plus Jakarta Sans | 22px / 1.375rem | 600 | 1.35 |
| H4 | Plus Jakarta Sans | 18px / 1.125rem | 600 | 1.4 |
| Body Large | Inter | 17px / 1.0625rem | 400 | 1.65 |
| Body | Inter | 15px / 0.9375rem | 400 | 1.6 |
| Body Small | Inter | 13px / 0.8125rem | 400 | 1.55 |
| Label | Inter | 12px / 0.75rem | 600 | 1 |
| Caption | Inter | 11px / 0.6875rem | 400 | 1.45 |

### Contoh Penggunaan
```
"Cari Stok Darah Terdekat"                   → H1, Plus Jakarta Sans 700
"Temukan golongan darah yang kamu butuhkan"   → Body Large, Inter 400
"STOK KRITIS"                                 → Label, Inter 700, uppercase, #E74C3C
"Terakhir diperbarui: 10 menit lalu"          → Caption, #9B9BB5
```

---

## 4. Spacing & Layout

### Spacing Scale (base 8px grid)

| Token | Value | Penggunaan |
|-------|-------|-----------|
| `--space-1` | 4px | Gap ikon inline, padding micro |
| `--space-2` | 8px | Padding badge, gap elemen kecil |
| `--space-3` | 12px | Gap dalam list |
| `--space-4` | 16px | Padding card compact |
| `--space-6` | 24px | Padding card default |
| `--space-8` | 32px | Gap section dalam page |
| `--space-10` | 40px | Margin antar section besar |
| `--space-12` | 48px | Padding section hero |
| `--space-16` | 64px | Margin section page |
| `--space-20` | 80px | Padding hero full |

### Layout Grid

```
Max content width : 1280px
Gutter (desktop)  : 24px
Gutter (tablet)   : 16px
Gutter (mobile)   : 16px
Kolom desktop     : 12 kolom
```

### Breakpoints

| Name | Min-width |
|------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

---

## 5. Border Radius

| Token | Value | Penggunaan |
|-------|-------|-----------|
| `--radius-xs` | 4px | Badge, tag kecil |
| `--radius-sm` | 8px | Input field, tombol kecil |
| `--radius-md` | 12px | Card default |
| `--radius-lg` | 16px | Card besar, panel |
| `--radius-xl` | 24px | Modal, drawer |
| `--radius-full` | 9999px | Avatar, chip, tombol pill |

---

## 6. Shadows & Elevation

| Level | CSS | Penggunaan |
|-------|-----|-----------|
| Elevation 0 | `none` | Flat surface |
| Elevation 1 | `0 1px 3px rgba(0,0,0,0.08)` | Card default |
| Elevation 2 | `0 4px 12px rgba(0,0,0,0.10)` | Card hover, dropdown |
| Elevation 3 | `0 8px 24px rgba(0,0,0,0.12)` | Modal, drawer |
| Elevation 4 | `0 16px 48px rgba(0,0,0,0.16)` | Popup penting |

---

## 7. Component Patterns

### 7.1 Button

**Primary**
```
Background : #C0392B
Text       : white, 15px, Inter 600
Padding    : 12px 24px
Radius     : 8px
Hover      : background #922B21, shadow elevation-2
Active     : scale(0.98)
Contoh     : "Cari Stok Darah", "Tambah Stok", "Login"
```

**Secondary**
```
Background : transparent
Border     : 1.5px solid #C0392B
Text       : #C0392B, 15px, Inter 600
Padding    : 11px 24px
Hover      : background #FDEDEC
```

**Ghost**
```
Background : transparent
Text       : #4A4A6A, 14px, Inter 500
Hover      : text #C0392B, background #FDEDEC rounded
```

**Disabled**
```
Background : #ECECEC
Text       : #9B9BB5
Cursor     : not-allowed
```

### 7.2 Kartu Stok Darah

```
┌──────────────────────────────────────┐
│  [Ikon]  RS. Siloam Surabaya         │
│  Golongan: A+     ████ 45 kantong    │
│  ────────────────────────────────    │
│  📍 Jl. Gubeng No.1, Surabaya        │
│  🕐 Diperbarui 5 menit lalu          │
│                          [Hubungi]   │
└──────────────────────────────────────┘

- Background       : white
- Border-left      : 4px solid [warna golongan darah]
- Border-radius    : 12px
- Shadow           : elevation-1
- Hover            : elevation-2, border-left 6px
```

### 7.3 Badge Status Stok

```
KRITIS   → bg #FDEDEC, text #C0392B, border #E74C3C
RENDAH   → bg #FEF9E7, text #E67E22, border #E67E22
SEDANG   → bg #FFFDE7, text #B7950B, border #F1C40F
CUKUP    → bg #EAFAF1, text #1E8449, border #27AE60

Format: HURUF KAPITAL, 11px, Inter 700,
        padding 3px 8px, border-radius 4px
```

### 7.4 Input Field

```
Height      : 44px
Border      : 1.5px solid rgba(0,0,0,0.12)
Radius      : 8px
Background  : #F4F4F8
Focus       : border #C0392B, ring rgba(192,57,43,0.15)
Placeholder : #9B9BB5
Text        : #1A1A2E

Search input : ikon Search di kiri, padding-left 44px
Select       : ikon chevron di kanan
```

### 7.5 Navigation Bar

```
Desktop:
- Height          : 64px
- Background      : white
- Border-bottom   : 1px solid rgba(0,0,0,0.08)
- Shadow          : elevation-1
- Logo (kiri)     : ikon tetesan + "Suroboyo Bloods" (H4 bold)
- Links (tengah)  : Beranda | Cari Stok | Tambah Stok | Event | Info
- CTA (kanan)     : tombol "Login" primary kecil
- Active link     : text #C0392B, underline 2px

Mobile:
- Hamburger kanan
- Drawer slide dari kiri, full height
```

### 7.6 Hero Section

```
Background : gradient linear #C0392B → #922B21
            (atau gambar gelap + overlay rgba(192,57,43,0.85))
Padding    : 80px 0 desktop / 60px 0 mobile

Elemen:
- Eyebrow  : "PMII × Surabaya" — label putih kecil, uppercase
- Heading  : Display size, putih
- Sub      : Body large, rgba(255,255,255,0.85)
- CTA bar  : Search inline (golongan + kota) + tombol "Cari Sekarang"
- Stat strip: "1,200+ Pendonor" | "24 RS Mitra" | "Stok Live 24/7"
```

---

## 8. Iconography

Library: **Lucide React** (sudah terinstall)

| Konteks | Icon |
|---------|------|
| Donor darah | `Droplets`, `Heart` |
| Lokasi RS | `MapPin`, `Building2` |
| Stok | `Package`, `Database` |
| Tambah stok | `PlusCircle`, `FilePlus` |
| Darurat | `AlertTriangle`, `Siren` |
| Login | `User`, `LogIn`, `Shield` |
| Event | `Calendar`, `CalendarDays` |
| Info / FAQ | `Info`, `HelpCircle`, `BookOpen` |
| Pencarian | `Search`, `Filter`, `SlidersHorizontal` |
| Telepon | `Phone`, `PhoneCall` |
| Waktu | `Clock`, `Timer` |

**Ukuran standar:**
- 16px — dalam teks / badge
- 20px — dalam tombol, list item
- 24px — ikon heading section
- 32px — ikon feature card
- 48px — ilustrasi besar / empty state

---

## 9. Animasi & Transisi

| Event | Duration | Easing |
|-------|----------|--------|
| Button hover | 150ms | ease-out |
| Card hover | 200ms | ease-out |
| Dropdown open | 200ms | ease-out |
| Modal / drawer | 300ms | ease-in-out |
| Page transition | 400ms | ease-in-out |
| Badge pulse (kritis) | 1.5s infinite | ease-in-out |

```css
/* Badge KRITIS — pulse untuk menarik perhatian */
@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
```

---

## 10. Microcopy & Tone of Voice

### Prinsip
- **Langsung** — "Cari darah sekarang", bukan "Silakan mulai pencarian Anda"
- **Manusiawi** — gunakan "kamu" bukan "Anda"
- **Urgensi tanpa kepanikan** — kritis tapi tidak menakutkan
- **Bahasa Indonesia** sebagai default

### Contoh Teks

| Situasi | Teks |
|---------|------|
| CTA hero | "Cari Stok Darah Sekarang" |
| Stok kritis | "Stok kritis — segera hubungi RS" |
| Stok kosong | "Stok tidak tersedia saat ini" |
| Berhasil tambah stok | "Stok darah berhasil diperbarui!" |
| Form kosong | "Pilih golongan darah terlebih dahulu" |
| Empty state | "Tidak ada stok ditemukan. Coba perluas jangkauan." |
| Loading | "Mencari stok darah terdekat…" |
| Login gagal | "Email atau password salah. Silakan coba lagi." |

---

## 11. Aksesibilitas (A11y)

- Kontras warna minimum 4.5:1 untuk teks body, 3:1 untuk teks besar
- Focus ring visible, warna `rgba(192,57,43,0.5)`, lebar 3px
- Semua ikon interaktif harus punya `aria-label`
- Gambar konten harus ada `alt` text
- Setiap input harus ada label via `htmlFor`
- Badge status tidak boleh mengandalkan warna saja — tambahkan teks
- Semua aksi utama harus bisa dicapai dengan Tab + Enter

---

## 12. Responsivitas

### Aturan Mobile

1. Card stok: stack vertikal, full width
2. Navigation: drawer, bukan inline tabs
3. Hero search bar: vertical stack (golongan → kota → tombol)
4. Dashboard: horizontal scroll atau kartu alternatif
5. Peta: collapsible, di bawah list hasil

### Grid Pattern

```
Desktop : [Sidebar 280px] | [Konten utama flex-1]
Tablet  : [Konten full, filter di top bar]
Mobile  : [Stack vertikal, filter jadi drawer]
```

---

## 13. Design Token Reference (CSS Variables)

Tambahkan ke `src/styles/theme.css`:

```css
:root {
  /* Brand */
  --brand-red:       #C0392B;
  --brand-red-dark:  #922B21;
  --brand-red-light: #F1948A;
  --brand-red-pale:  #FDEDEC;

  /* Neutral */
  --neutral-900: #1A1A2E;
  --neutral-700: #4A4A6A;
  --neutral-400: #9B9BB5;
  --neutral-100: #F4F4F8;
  --neutral-50:  #FAFAFA;

  /* Status Stok */
  --status-critical:    #E74C3C;
  --status-low:         #E67E22;
  --status-medium:      #F1C40F;
  --status-good:        #27AE60;
  --status-unavailable: #95A5A6;

  /* Spacing (8px grid) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* Radius */
  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-1: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-2: 0 4px 12px rgba(0,0,0,0.10);
  --shadow-3: 0 8px 24px rgba(0,0,0,0.12);
  --shadow-4: 0 16px 48px rgba(0,0,0,0.16);
}
```

---

## 14. Checklist Handoff ke Developer

- [ ] Font diimpor di `src/styles/fonts.css`
- [ ] Semua token CSS ditambahkan ke `src/styles/theme.css`
- [ ] Komponen menggunakan token, bukan hardcoded hex
- [ ] Semua state tombol diimplementasikan (default, hover, active, disabled)
- [ ] Badge stok menggunakan warna + teks (tidak hanya warna)
- [ ] Semua form input punya label + error state
- [ ] Tampilan mobile dicek di 375px dan 390px
- [ ] Animasi dihormati: gunakan `prefers-reduced-motion`

---

*Suroboyo Bloods Design Guidelines — PMII × Rumah Sakit Surabaya*
*Versi 1.0 — Mei 2026*
