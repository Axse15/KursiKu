import { useCallback, useEffect, useRef, useState } from "react";
import { CITIES, haversineKm } from "./nearby";

// Koordinat hanya disimpan di sessionStorage browser ini dan TIDAK dikirim ke server mana pun.
const KEY = "kursiku_geo";
const FRESH_MS = 30 * 60 * 1000;
const GEO_TIMEOUT_MS = 15000;

function readSaved() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!v || Date.now() - v.at > FRESH_MS) return null;
    if (v.status === "ok" && Number.isFinite(v.lat) && Number.isFinite(v.lon))
      return v;
    if (v.status === "denied") return v;
  } catch {
    /* abaikan */
  }
  return null;
}
function save(v) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...v, at: Date.now() }));
  } catch {
    /* abaikan */
  }
}

export function cinemaCoords(c) {
  const lat = Number(c?.lat);
  const lon = Number(c?.lon);
  if (
    c?.lat != null &&
    c?.lon != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
  )
    return { lat, lon };
  const city = CITIES.find(
    (x) => x.name.toLowerCase() === String(c?.city || "").toLowerCase(),
  );
  return city ? { lat: city.lat, lon: city.lon } : null;
}

export function rankCinemas(cinemas, lat, lon) {
  return cinemas
    .map((cinema) => {
      const p = cinemaCoords(cinema);
      return p ? { cinema, km: haversineKm(lat, lon, p.lat, p.lon) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.km - b.km);
}

export function useUserLocation({ auto = false } = {}) {
  const saved = useRef(readSaved());
  const [state, setState] = useState(() =>
    saved.current?.status === "ok"
      ? { status: "ok", lat: saved.current.lat, lon: saved.current.lon }
      : saved.current?.status === "denied"
        ? { status: "denied" }
        : { status: "idle" },
  );
  const busy = useRef(false);

  const request = useCallback(() => {
    if (busy.current) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "unavailable" });
      return;
    }
    busy.current = true;
    setState({ status: "locating" });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      busy.current = false;
      setState({ status: "unavailable" });
    }, GEO_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        busy.current = false;
        const v = {
          status: "ok",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        save(v);
        setState(v);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        busy.current = false;
        if (err.code === 1) {
          save({ status: "denied" });
          setState({ status: "denied" });
        } else setState({ status: "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const tried = useRef(false);
  useEffect(() => {
    if (!auto || tried.current || state.status !== "idle") return;
    tried.current = true;
    request();
  }, [auto, state.status, request]);

  return { ...state, request };
}
