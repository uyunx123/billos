/**
 * Indonesian province → regencies/cities dataset for the checkout address
 * cascade. Curated to well-known provincial capitals and major kota —
 * sized for a demo store. Swap in the full Kemendagri dataset for
 * production.
 */

export interface RegionProvince {
  name: string;
  cities: string[];
}

export const INDONESIA_REGIONS: RegionProvince[] = [
  { name: "Aceh", cities: ["Banda Aceh", "Lhokseumawe", "Langsa", "Sabang"] },
  { name: "Sumatera Utara", cities: ["Medan", "Binjai", "Tebing Tinggi", "Pematangsiantar", "Sibolga", "Padang Sidempuan", "Kisaran"] },
  { name: "Sumatera Barat", cities: ["Padang", "Bukittinggi", "Payakumbuh", "Solok", "Pariaman"] },
  { name: "Riau", cities: ["Pekanbaru", "Dumai", "Bengkalis", "Siak"] },
  { name: "Kepulauan Riau", cities: ["Tanjungpinang", "Batam"] },
  { name: "Jambi", cities: ["Jambi", "Sungai Penuh"] },
  { name: "Sumatera Selatan", cities: ["Palembang", "Prabumulih", "Lubuklinggau"] },
  { name: "Bangka Belitung", cities: ["Pangkal Pinang", "Tanjung Pandan"] },
  { name: "Bengkulu", cities: ["Bengkulu", "Curup"] },
  { name: "Lampung", cities: ["Bandar Lampung", "Metro", "Kota Bumi"] },
  { name: "DKI Jakarta", cities: ["Jakarta Pusat", "Jakarta Utara", "Jakarta Barat", "Jakarta Selatan", "Jakarta Timur"] },
  { name: "Banten", cities: ["Serang", "Cilegon", "Tangerang", "Tangerang Selatan"] },
  { name: "Jawa Barat", cities: ["Bandung", "Cirebon", "Bogor", "Depok", "Bekasi", "Karawang", "Purwakarta", "Cianjur", "Sukabumi", "Garut", "Tasikmalaya", "Cimahi", "Banjar", "Indramayu", "Sumedang"] },
  { name: "Jawa Tengah", cities: ["Semarang", "Solo (Surakarta)", "Purwokerto", "Tegal", "Pekalongan", "Magelang", "Kudus", "Salatiga", "Cilacap", "Klaten", "Pati"] },
  { name: "DI Yogyakarta", cities: ["Yogyakarta", "Sleman", "Bantul", "Kulon Progo", "Gunungkidul"] },
  { name: "Jawa Timur", cities: ["Surabaya", "Malang", "Sidoarjo", "Gresik", "Mojokerto", "Blitar", "Madiun", "Kediri", "Ponorogo", "Jombang", "Lamongan", "Bojonegoro", "Nganjuk", "Probolinggo", "Pasuruan"] },
  { name: "Bali", cities: ["Denpasar", "Singaraja", "Gianyar", "Tabanan", "Klungkung"] },
  { name: "Nusa Tenggara Barat", cities: ["Mataram", "Bima", "Dompu", "Sumbawa Besar", "Praya"] },
  { name: "Nusa Tenggara Timur", cities: ["Kupang", "Ende", "Maumere", "Ruteng", "Waingapu", "Atambua", "Labuan Bajo"] },
  { name: "Kalimantan Barat", cities: ["Pontianak", "Singkawang", "Ketapang", "Sanggau", "Sambas"] },
  { name: "Kalimantan Tengah", cities: ["Palangka Raya", "Sampit", "Kuala Kapuas", "Pangkalan Bun"] },
  { name: "Kalimantan Selatan", cities: ["Banjarmasin", "Banjarbaru", "Marabahan", "Barabai", "Pelaihari"] },
  { name: "Kalimantan Timur", cities: ["Samarinda", "Balikpapan", "Bontang", "Penajam"] },
  { name: "Kalimantan Utara", cities: ["Tanjung Selor", "Tarakan", "Nunukan"] },
  { name: "Sulawesi Utara", cities: ["Manado", "Bitung", "Tomohon", "Kotamobagu"] },
  { name: "Gorontalo", cities: ["Gorontalo"] },
  { name: "Sulawesi Tengah", cities: ["Palu", "Luwuk", "Poso", "Toli-Toli"] },
  { name: "Sulawesi Barat", cities: ["Mamuju", "Polewali", "Majene"] },
  { name: "Sulawesi Selatan", cities: ["Makassar", "Gowa", "Maros", "Palopo", "Bulukumba", "Watampone", "Sinjai", "Parepare"] },
  { name: "Sulawesi Tenggara", cities: ["Kendari", "Baubau", "Kolaka"] },
  { name: "Maluku", cities: ["Ambon", "Tual"] },
  { name: "Maluku Utara", cities: ["Ternate", "Tidore", "Sofifi"] },
  { name: "Papua Barat", cities: ["Manokwari", "Fakfak", "Kaimana"] },
  { name: "Papua", cities: ["Jayapura", "Biak", "Wamena", "Timika", "Serui"] },
  { name: "Papua Selatan", cities: ["Merauke", "Agats"] },
  { name: "Papua Tengah", cities: ["Nabire", "Enarotali"] },
  { name: "Papua Pegunungan", cities: ["Wamena", "Oksibil"] },
];

export function citiesOfProvince(provinceName: string): string[] {
  const found = INDONESIA_REGIONS.find((p) => p.name === provinceName);
  return found ? found.cities : [];
}