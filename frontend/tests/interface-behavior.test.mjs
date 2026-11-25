import test from "node:test";
import assert from "node:assert/strict";

import {
  getNavigationItems,
  getPageMeta,
  getDashboardPulse,
  getCollectionState,
  getAnalysisStage,
  getAnalysisUnavailableCopy,
  isNavigationItemActive,
  normalizeApiError,
} from "../src/lib/interface.mjs";

test("navigation exposes the four primary Indonesian destinations", () => {
  assert.deepEqual(getNavigationItems(), [
    { href: "/", label: "Ringkasan", shortLabel: "Ringkas" },
    { href: "/upload", label: "Unggah data", shortLabel: "Unggah" },
    { href: "/insights", label: "Insight", shortLabel: "Insight" },
    { href: "/explorer", label: "Jelajah data", shortLabel: "Data" },
  ]);
});

test("analysis load failures are not described as missing records", () => {
  assert.deepEqual(getAnalysisUnavailableCopy(true), {
    title: "Hasil analisis belum dapat dimuat",
    description: "Periksa layanan API, lalu coba lagi atau kembali ke halaman unggahan.",
  });
  assert.deepEqual(getAnalysisUnavailableCopy(false), {
    title: "Analisis tidak ditemukan",
    description: "ID analisis yang Anda cari tidak tersedia atau belum dibuat.",
  });
});

test("analysis stages use consistent status and recovery language", () => {
  assert.deepEqual(getAnalysisStage("processing"), {
    label: "Sedang dianalisis",
    title: "Data bisnis Anda sedang diproses",
  });
  assert.deepEqual(getAnalysisStage("failed"), {
    label: "Analisis gagal",
    title: "Kami belum dapat menyelesaikan analisis",
  });
  assert.deepEqual(getAnalysisStage("completed"), {
    label: "Selesai",
    title: "Hasil analisis siap dibaca",
  });
});

test("collection state never disguises a failed request as an empty result", () => {
  assert.equal(getCollectionState({ loading: true, error: false, count: 0 }), "loading");
  assert.equal(getCollectionState({ loading: false, error: true, count: 0 }), "error");
  assert.equal(getCollectionState({ loading: false, error: false, count: 0 }), "empty");
  assert.equal(getCollectionState({ loading: false, error: false, count: 2 }), "ready");
});

test("dashboard pulse directs new and returning users to the next useful action", () => {
  assert.deepEqual(getDashboardPulse(0, 0), {
    title: "Mulai dari data yang Anda punya",
    description: "Unggah laporan penjualan, keuangan, atau operasional untuk menemukan pola penting.",
    action: "Unggah data pertama",
  });
  assert.deepEqual(getDashboardPulse(7, 3), {
    title: "3 analisis siap dibaca",
    description: "Tersusun dari 7 berkas yang sudah Anda tambahkan.",
    action: "Tambah data",
  });
});

test("nested analysis routes keep no primary navigation item active", () => {
  assert.equal(isNavigationItemActive("/analysis/abc", "/"), false);
  assert.equal(isNavigationItemActive("/analysis/abc", "/upload"), false);
});

test("route metadata gives people useful Indonesian context", () => {
  assert.deepEqual(getPageMeta("/upload"), {
    title: "Unggah data",
    description: "Tambahkan data bisnis untuk mulai dianalisis.",
  });
  assert.deepEqual(getPageMeta("/analysis/abc"), {
    title: "Hasil analisis",
    description: "Temukan pola, risiko, dan langkah berikutnya.",
  });
});

test("API errors prefer a server detail and fall back to actionable copy", () => {
  assert.equal(
    normalizeApiError({ response: { data: { detail: "Berkas terlalu besar" } } }, "Coba lagi."),
    "Berkas terlalu besar"
  );
  assert.equal(normalizeApiError(new Error("Network Error"), "Coba lagi."), "Coba lagi.");
  assert.equal(normalizeApiError(null, "Coba lagi."), "Coba lagi.");
});
