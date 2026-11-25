const NAVIGATION_ITEMS = [
  { href: "/", label: "Ringkasan", shortLabel: "Ringkas" },
  { href: "/upload", label: "Unggah data", shortLabel: "Unggah" },
  { href: "/insights", label: "Insight", shortLabel: "Insight" },
  { href: "/explorer", label: "Jelajah data", shortLabel: "Data" },
];

const PAGE_META = {
  "/": {
    title: "Ringkasan bisnis",
    description: "Pantau aktivitas dan temukan hal yang perlu diperhatikan.",
  },
  "/upload": {
    title: "Unggah data",
    description: "Tambahkan data bisnis untuk mulai dianalisis.",
  },
  "/insights": {
    title: "Insight",
    description: "Baca temuan penting dan rekomendasi dari seluruh data.",
  },
  "/explorer": {
    title: "Jelajah data",
    description: "Telusuri data yang sudah dianalisis dengan lebih rinci.",
  },
};

export function getNavigationItems() {
  return NAVIGATION_ITEMS.map((item) => ({ ...item }));
}

export function isNavigationItemActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getPageMeta(pathname) {
  if (pathname.startsWith("/analysis/")) {
    return {
      title: "Hasil analisis",
      description: "Temukan pola, risiko, dan langkah berikutnya.",
    };
  }

  return PAGE_META[pathname] || PAGE_META["/"];
}

export function getDashboardPulse(totalUploads, totalAnalyses) {
  if (totalUploads === 0 && totalAnalyses === 0) {
    return {
      title: "Mulai dari data yang Anda punya",
      description: "Unggah laporan penjualan, keuangan, atau operasional untuk menemukan pola penting.",
      action: "Unggah data pertama",
    };
  }

  return {
    title: `${totalAnalyses} analisis siap dibaca`,
    description: `Tersusun dari ${totalUploads} berkas yang sudah Anda tambahkan.`,
    action: "Tambah data",
  };
}

export function getCollectionState({ loading, error, count }) {
  if (loading) return "loading";
  if (error) return "error";
  return count > 0 ? "ready" : "empty";
}

export function getAnalysisStage(status) {
  if (status === "processing" || status === "pending") {
    return { label: "Sedang dianalisis", title: "Data bisnis Anda sedang diproses" };
  }
  if (status === "failed") {
    return { label: "Analisis gagal", title: "Kami belum dapat menyelesaikan analisis" };
  }
  return { label: "Selesai", title: "Hasil analisis siap dibaca" };
}

export function getAnalysisUnavailableCopy(hasError) {
  if (hasError) {
    return {
      title: "Hasil analisis belum dapat dimuat",
      description: "Periksa layanan API, lalu coba lagi atau kembali ke halaman unggahan.",
    };
  }
  return {
    title: "Analisis tidak ditemukan",
    description: "ID analisis yang Anda cari tidak tersedia atau belum dibuat.",
  };
}

export function normalizeApiError(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;

  const message = error instanceof Error ? error.message : "";
  if (message && message !== "Network Error") return message;
  return fallback;
}
