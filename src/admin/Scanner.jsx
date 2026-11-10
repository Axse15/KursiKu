import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { btnSmall, cardFlat } from "./kit";

// Pindai QR lewat kamera. Setiap kode tiket yang terbaca dikirim ke onCode (satu kali per kode, lalu jeda
// supaya tiket yang masih di depan kamera tidak terkirim berulang). QR yang bukan kode tiket diabaikan.
const CODE = /KSK-[A-Z0-9]{6}/i;
const SAME_CODE_PAUSE = 4000;
const ANY_CODE_PAUSE = 1200;
const MAX_W = 640; // frame diperkecil dulu supaya HP lama tetap lancar

const REASONS = {
  NotAllowedError:
    "Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, lalu coba lagi.",
  PermissionDeniedError:
    "Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, lalu coba lagi.",
  NotFoundError: "Kamera tidak ditemukan di perangkat ini.",
  NotReadableError:
    "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.",
  OverconstrainedError: "Kamera yang diminta tidak tersedia di perangkat ini.",
};

export default function Scanner({ onCode, onClose }) {
  const video = useRef(null);
  const onCodeRef = useRef(onCode);
  const [state, setState] = useState("starting"); // starting | scanning | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    let stream = null;
    let raf = 0;
    let stopped = false;
    let last = { code: "", at: 0 };
    let pausedUntil = 0;
    let lastTick = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function fail(text) {
      setMessage(text);
      setState("error");
    }

    function tick(now) {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      const v = video.current;
      // sekitar 8 kali per detik sudah cukup, dan hemat baterai
      if (
        !v ||
        v.readyState < 2 ||
        !v.videoWidth ||
        now - lastTick < 120 ||
        now < pausedUntil
      )
        return;
      lastTick = now;
      const scale = Math.min(1, MAX_W / v.videoWidth);
      canvas.width = Math.round(v.videoWidth * scale);
      canvas.height = Math.round(v.videoHeight * scale);
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hit = jsQR(img.data, img.width, img.height, {
        inversionAttempts: "dontInvert",
      });
      const code = hit?.data?.match(CODE)?.[0]?.toUpperCase();
      if (!code) return;
      const t = Date.now();
      if (code === last.code && t - last.at < SAME_CODE_PAUSE) return;
      last = { code, at: t };
      pausedUntil = now + ANY_CODE_PAUSE;
      try {
        navigator.vibrate?.(80);
      } catch {
        // tidak semua perangkat punya getar
      }
      onCodeRef.current(code);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        fail(
          "Browser ini tidak bisa membuka kamera. Kamera hanya jalan di alamat https, jadi buka situs lewat alamat resminya.",
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = video.current;
        v.srcObject = stream;
        await v.play();
        setState("scanning");
        raf = requestAnimationFrame(tick);
      } catch (e) {
        fail(
          REASONS[e?.name] ||
            "Kamera tidak bisa dibuka. Coba lagi, atau ketik kodenya.",
        );
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (video.current) video.current.srcObject = null;
    };
  }, []);

  return (
    <div className={`${cardFlat} mt-4 overflow-hidden`}>
      <div className="relative bg-black">
        <video
          ref={video}
          playsInline
          muted
          aria-label="Tampilan kamera untuk memindai tiket"
          className="mx-auto block max-h-[60vh] w-full object-contain"
        />
        {state === "scanning" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div className="size-1/2 min-h-32 min-w-32 rounded-2xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {state === "starting" && (
          <p className="absolute inset-0 grid place-items-center text-sm font-bold text-white">
            Membuka kamera…
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
        {state === "error" ? (
          <p role="alert" className="text-danger">
            {message}
          </p>
        ) : (
          <p role="status" className="text-ink-2">
            Arahkan kamera ke QR di tiket. Kode yang terbaca langsung diperiksa.
          </p>
        )}
        <button type="button" onClick={onClose} className={btnSmall}>
          Selesai memindai
        </button>
      </div>
    </div>
  );
}
