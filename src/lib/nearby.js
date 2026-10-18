// Bioskop terdekat dari OpenStreetMap lewat Overpass API (gratis, tanpa kunci API).
//
// Batasan yang jujur:
//  - Data dari sukarelawan OpenStreetMap, jadi di sebagian daerah bisa kurang lengkap.
//  - Hanya info lokasi. Jadwal dan harga bioskop sungguhan TIDAK ada di sini, dan tidak terhubung ke pemesanan KursiKu.
//  - Server Overpass publik punya batas pemakaian; hasil disimpan sebentar di browser supaya tidak meminta berulang.

// Server Overpass dari daftar resmi wiki OpenStreetMap. Server publik gratis ini sering sibuk (504/429),
// jadi ada sumber cadangan: Nominatim (juga data OpenStreetMap, tapi server dan cara kerja berbeda).
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
export const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
// Urutan percobaan: Overpass utama -> Nominatim -> Overpass cadangan (yang berikutnya ikut jalan kalau yang sebelumnya lambat/gagal)
export const NEARBY_SOURCES = [
  OVERPASS_ENDPOINTS[0],
  NOMINATIM_ENDPOINT,
  OVERPASS_ENDPOINTS[1],
];

export const CITIES = [
  { name: "Jakarta", lat: -6.2088, lon: 106.8456 },
  { name: "Bandung", lat: -6.9175, lon: 107.6191 },
  { name: "Surabaya", lat: -7.2575, lon: 112.7521 },
  { name: "Yogyakarta", lat: -7.7956, lon: 110.3695 },
  { name: "Semarang", lat: -6.9667, lon: 110.4167 },
  { name: "Medan", lat: 3.5952, lon: 98.6722 },
  { name: "Makassar", lat: -5.1477, lon: 119.4327 },
  { name: "Denpasar", lat: -8.6705, lon: 115.2126 },
  { name: "Palembang", lat: -2.9761, lon: 104.7754 },
  { name: "Balikpapan", lat: -1.2379, lon: 116.8529 },
];

export const RADII_KM = [3, 5, 10, 20];

// Batas waktu di sisi browser per server. Tanpa ini, koneksi yang menggantung membuat layar loading selamanya.
export const ENDPOINT_TIMEOUT_MS = 12000;
// Kalau server pertama belum menjawab setelah sekian ms, server berikutnya ikut dicoba (balapan, yang tercepat menang).
export const HEDGE_MS = 2500;

export function buildQuery(lat, lon, radiusKm) {
  const r = Math.round(radiusKm * 1000);
  return `[out:json][timeout:12];nwr["amenity"="cinema"]["name"](around:${r},${lat},${lon});out center tags;`;
}

// jarak garis lurus (km), rumus haversine
// Nominatim: cari "cinema" di dalam kotak yang melingkupi radius, lalu saring jaraknya sendiri.
export function nominatimUrl(lat, lon, radiusKm) {
  const dLat = radiusKm / 111.32;
  const dLon =
    radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const q = new URLSearchParams({
    format: "jsonv2",
    q: "cinema",
    viewbox: [lon - dLon, lat + dLat, lon + dLon, lat - dLat]
      .map((n) => n.toFixed(5))
      .join(","),
    bounded: "1",
    limit: "40",
    dedupe: "0",
    addressdetails: "1",
    extratags: "1",
    "accept-language": "id",
  });
  return `${NOMINATIM_ENDPOINT}?${q}`;
}

// Ubah jawaban Nominatim ke bentuk elemen Overpass supaya parseOverpass bisa dipakai ulang.
export function nominatimToElements(rows, lat, lon, radiusKm) {
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r?.category !== "amenity" || r?.type !== "cinema") continue;
    const la = Number(r.lat);
    const lo = Number(r.lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    if (haversineKm(lat, lon, la, lo) > radiusKm) continue;
    const a = r.address || {};
    const x = r.extratags || {};
    out.push({
      type: r.osm_type || "node",
      id: r.osm_id,
      lat: la,
      lon: lo,
      tags: {
        name: r.name || "",
        brand: x.brand,
        operator: x.operator,
        website: x.website || x["contact:website"],
        opening_hours: x.opening_hours,
        "addr:street": a.road,
        "addr:housenumber": a.house_number,
        "addr:suburb": a.suburb || a.village || a.neighbourhood,
        "addr:city": a.city || a.town || a.county || a.municipality,
      },
    });
  }
  return out;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Jaringan bioskop dikenali dari nama/brand/operator di data OSM. Kalau tidak cocok, kosong (bukan ditebak).
const BRANDS = [
  ["CGV", /\bcgv\b|blitz\s*megaplex/i],
  [
    "XXI",
    /\bxxi\b|\bcinema\s*21\b|\bcineplex\s*21\b|\b21\s*cineplex\b|\bthe\s+premiere\b/i,
  ],
  ["Cinépolis", /cin[eé]polis/i],
  ["Flix", /\bflix\b/i],
  ["Movimax", /movimax/i],
  ["Platinum", /platinum\s*cineplex/i],
  ["Cinemaxx", /cinemaxx/i],
];

// Format layar / kelas studio yang disebut di nama atau keterangan. Satu bioskop bisa punya beberapa (mis. CGV dengan IMAX dan 4DX).
const FORMATS = [
  ["IMAX", /\bimax\b/i],
  ["4DX", /\b4dx\b/i],
  ["ScreenX", /screen\s*x\b/i],
  ["Dolby Atmos", /dolby/i],
  ["Premiere", /premiere/i],
  ["Velvet", /velvet/i],
  ["Gold Class", /gold\s*class/i],
  ["Sweetbox", /sweet\s*box/i],
  ["Sphere X", /sphere\s*x\b/i],
];

// Situs resmi tiap jaringan. Tiket sungguhan hanya bisa dibeli di sana; KursiKu hanya simulasi.
export const BRAND_SITES = {
  XXI: "https://21cineplex.com",
  CGV: "https://www.cgv.id",
};

const hayOf = (tags) =>
  [
    tags.brand,
    tags.operator,
    tags.name,
    tags["name:en"],
    tags.alt_name,
    tags.short_name,
    tags.official_name,
    tags.description,
    tags.note,
  ]
    .filter(Boolean)
    .join(" ");

export function detectBrand(tags = {}) {
  const hit = BRANDS.find(([, re]) => re.test(hayOf(tags)));
  return hit ? hit[0] : null;
}

// Daftar format yang terdeteksi, tanpa duplikat. Tag OSM eksplisit (mis. imax=yes) juga dihitung.
export function detectFormats(tags = {}) {
  const hay = hayOf(tags);
  const out = FORMATS.filter(([, re]) => re.test(hay)).map(([name]) => name);
  const yes = (k) => String(tags[k] || "").toLowerCase() === "yes";
  if (
    (yes("imax") || yes("cinema:imax") || yes("screen:imax")) &&
    !out.includes("IMAX")
  )
    out.unshift("IMAX");
  if ((yes("4dx") || yes("cinema:4dx")) && !out.includes("4DX"))
    out.push("4DX");
  return out;
}

function addressOf(t) {
  if (t["addr:full"]) return t["addr:full"];
  const street = [t["addr:street"], t["addr:housenumber"]]
    .filter(Boolean)
    .join(" ");
  return [street, t["addr:suburb"] || t["addr:subdistrict"], t["addr:city"]]
    .filter(Boolean)
    .join(", ");
}

const safeUrl = (u) => {
  if (!u) return null;
  const s = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
};

// Respons Overpass -> daftar bioskop terurut dari yang terdekat.
export function parseOverpass(json, lat, lon) {
  const seen = new Set();
  const out = [];
  for (const el of json?.elements || []) {
    const t = el.tags || {};
    const name = (t.name || "").trim();
    const la = el.lat ?? el.center?.lat;
    const lo = el.lon ?? el.center?.lon;
    if (!name || typeof la !== "number" || typeof lo !== "number") continue; // tanpa nama/koordinat tidak berguna
    const key = `${name.toLowerCase()}|${la.toFixed(3)}|${lo.toFixed(3)}`; // gedung yang sama sering tercatat sebagai titik + area
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${el.type}/${el.id}`,
      name,
      brand: detectBrand(t),
      formats: detectFormats(t),
      address: addressOf(t),
      website: safeUrl(t.website || t["contact:website"]),
      hours: t.opening_hours || null,
      lat: la,
      lon: lo,
      km: haversineKm(lat, lon, la, lo),
    });
  }
  return out.sort((a, b) => a.km - b.km);
}

export const fmtKm = (km) =>
  km < 1
    ? `${Math.round(km * 10) * 100} m`
    : `${km.toFixed(1).replace(".", ",")} km`;

// Tautan resmi Google Maps (tanpa API key): membuka rute ke koordinat itu.
export const directionsUrl = (b) =>
  `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`;

const CACHE_MS = 10 * 60 * 1000;
const cacheKey = (lat, lon, r) =>
  `kursiku_nearby_${lat.toFixed(3)}_${lon.toFixed(3)}_${r}`;

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { at, json } = JSON.parse(raw);
    return Date.now() - at < CACHE_MS ? json : null;
  } catch {
    return null;
  }
}
function writeCache(key, json) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), json }));
  } catch {
    /* penyimpanan penuh/diblokir: lewati saja */
  }
}

const abortError = () => {
  const e = new Error("Dibatalkan");
  e.name = "AbortError";
  return e;
};

/**
 * Cari bioskop. Server dicoba berurutan, tetapi kalau yang sebelumnya belum menjawab setelah `hedgeMs`
 * (atau sudah gagal), server berikutnya langsung ikut. Jawaban valid pertama menang, sisanya dibatalkan.
 * Dulu server dicoba satu per satu dan menunggu habis, jadi satu server mati = layar loading belasan detik.
 * @returns {Promise<{items: object[], fromCache: boolean}>}
 */
export function fetchNearby(
  lat,
  lon,
  radiusKm,
  {
    signal,
    fetchImpl = fetch,
    endpoints = NEARBY_SOURCES,
    timeoutMs = ENDPOINT_TIMEOUT_MS,
    hedgeMs = HEDGE_MS,
  } = {},
) {
  const key = cacheKey(lat, lon, radiusKm);
  const cached = readCache(key);
  if (cached)
    return Promise.resolve({
      items: parseOverpass(cached, lat, lon),
      fromCache: true,
    });
  if (signal?.aborted) return Promise.reject(abortError());

  const body = new URLSearchParams({ data: buildQuery(lat, lon, radiusKm) });

  return new Promise((resolve, reject) => {
    let done = false;
    let started = 0;
    let failed = 0;
    const errors = [];
    let softEmpty = false; // Nominatim menjawab kosong: belum tentu benar-benar kosong, tunggu sumber lain dulu
    const ctrls = [];
    const timers = new Set();

    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
      return t;
    };
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      timers.clear();
      ctrls.forEach((c) => c.abort());
      signal?.removeEventListener("abort", onUserAbort);
      fn(value);
    };
    const onUserAbort = () => finish(reject, abortError());
    signal?.addEventListener("abort", onUserAbort, { once: true });

    const fail = (err) => {
      errors.push(err);
      failed += 1;
      if (failed >= endpoints.length) {
        if (softEmpty) return finish(resolve, { items: [], fromCache: false });
        const known = errors.find((e) => e.message?.startsWith("Server"));
        finish(
          reject,
          known ||
            new Error(
              "Tidak bisa menghubungi server peta. Periksa koneksi, lalu coba lagi.",
            ),
        );
      }
    };

    function start() {
      if (done || started >= endpoints.length) return;
      const url = endpoints[started++];
      const ctrl = new AbortController();
      ctrls.push(ctrl);
      let timedOut = false;
      let settled = false;
      let hedge = null;
      const timer = later(() => {
        timedOut = true;
        ctrl.abort();
      }, timeoutMs);
      const settle = () => {
        settled = true;
        clearTimeout(timer);
        timers.delete(timer);
        if (hedge) {
          clearTimeout(hedge);
          timers.delete(hedge);
        }
      };

      const isNominatim = url === NOMINATIM_ENDPOINT;
      Promise.resolve()
        .then(() =>
          isNominatim
            ? fetchImpl(nominatimUrl(lat, lon, radiusKm), {
                method: "GET",
                signal: ctrl.signal,
                headers: { Accept: "application/json" },
              })
            : fetchImpl(url, {
                method: "POST",
                body,
                signal: ctrl.signal,
                headers: { Accept: "application/json" },
              }),
        )
        .then(async (res) => {
          if (res.status === 429)
            throw new Error(
              "Server peta sedang sibuk (terlalu banyak permintaan).",
            );
          if (!res.ok) throw new Error(`Server peta menjawab ${res.status}.`);
          const json = await res.json();
          if (isNominatim) {
            if (!Array.isArray(json))
              throw new Error("Jawaban server peta tidak dikenali.");
            return { elements: nominatimToElements(json, lat, lon, radiusKm) };
          }
          if (!Array.isArray(json?.elements))
            throw new Error("Jawaban server peta tidak dikenali.");
          return json;
        })
        .then(
          (json) => {
            if (done) return;
            settle();
            if (isNominatim && json.elements.length === 0) {
              softEmpty = true;
              fail(new Error("kosong"));
              start();
              return;
            }
            writeCache(key, json);
            finish(resolve, {
              items: parseOverpass(json, lat, lon),
              fromCache: false,
            });
          },
          (e) => {
            if (done || settled) return;
            settle();
            fail(
              timedOut
                ? new Error(
                    "Server peta terlalu lama menjawab. Coba lagi, atau kecilkan radius.",
                  )
                : e,
            );
            start(); // server ini gagal: jangan tunggu waktu balapan, langsung coba berikutnya
          },
        );

      if (started < endpoints.length) hedge = later(start, hedgeMs);
    }

    start();
  });
}
