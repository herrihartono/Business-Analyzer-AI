"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAnalyses, getUploads, sendChatMessage, type AnalysisResult, type UploadFile } from "@/lib/api";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  analysisId?: string;
}

export function ChatDrawer({ analysisId }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<UploadFile | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;

    getUploads()
      .then((data) => setUploads(data))
      .catch(() => {});

    getAnalyses()
      .then((data) => setAnalyses(data.filter((a) => a.status === "completed")))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const pathAnalysisId = pathname.match(/^\/analysis\/([^/]+)/)?.[1] || null;
  const activeAnalysisId = analysisId || pathAnalysisId || analyses[0]?.id || null;

  const filteredUploads =
    mentionQuery === null
      ? []
      : uploads.filter((upload) =>
          upload.original_name.toLowerCase().includes(mentionQuery.toLowerCase())
        );

  const setMentionFromUpload = (upload: UploadFile) => {
    const mentionToken = upload.original_name.replace(/\s+/g, "_");
    setSelectedUpload(upload);
    setInput((prev) => {
      const withMention = prev.replace(/(?:^|\s)@[^\s@]*$/, (match) =>
        match.startsWith(" ") ? ` @${mentionToken}` : `@${mentionToken}`
      );
      return `${withMention} `;
    });
    setMentionQuery(null);
  };

  const handleSend = async () => {
    const rawQuestion = input.trim();
    if (!rawQuestion || sending) return;

    const cleanedQuestion = rawQuestion.replace(/(^|\s)@\S+/g, " ").replace(/\s+/g, " ").trim();
    const question = cleanedQuestion || rawQuestion;
    const context = selectedUpload
      ? { uploadId: selectedUpload.id }
      : activeAnalysisId
        ? { analysisId: activeAnalysisId }
        : undefined;

    if (!context) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Silakan pilih file dengan @ terlebih dahulu, lalu kirim pertanyaan." },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setMentionQuery(null);
    setSending(true);

    try {
      const res = await sendChatMessage(question, context);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Pertanyaan belum dapat diproses. Silakan coba lagi." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        aria-label="Buka asisten data"
        className="fixed bottom-24 right-4 z-30 h-12 w-12 rounded-2xl shadow-lg md:bottom-6 md:right-6 md:h-14 md:w-14"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Tutup asisten data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              aria-label="Asisten data"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-card shadow-2xl sm:w-[420px]"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Tanya tentang data Anda</h3>
                </div>
                <Button variant="ghost" size="icon" aria-label="Tutup asisten data" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      <Bot className="mx-auto mb-2 h-8 w-8" />
                      <p>Tanyakan apa pun tentang hasil analisis.</p>
                      <p className="mt-1 text-xs">Gunakan @ untuk memilih berkas yang ingin dibahas.</p>
                      <div className="mx-auto mt-4 max-w-xs space-y-1 text-xs">
                        <button type="button" className="block w-full rounded-lg px-2 py-1.5 hover:bg-muted hover:text-foreground" onClick={() => setInput("Berikan ringkasan data ini")}>Ringkas data ini</button>
                        <button type="button" className="block w-full rounded-lg px-2 py-1.5 hover:bg-muted hover:text-foreground" onClick={() => setInput("Apa metrik terpentingnya?")}>Tunjukkan metrik penting</button>
                        <button type="button" className="block w-full rounded-lg px-2 py-1.5 hover:bg-muted hover:text-foreground" onClick={() => setInput("Apa yang sebaiknya saya lakukan berikutnya?")}>Berikan rekomendasi</button>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div>}
                      <div className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      {msg.role === "user" && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary"><User className="h-4 w-4 text-primary-foreground" /></div>}
                    </div>
                  ))}

                  {sending && <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div><span className="text-sm text-muted-foreground">Menyiapkan jawaban...</span></div>}
                  <div ref={endRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
                {selectedUpload && <div className="mb-2"><Badge variant="secondary" className="max-w-full gap-1"><span className="truncate">Konteks: {selectedUpload.original_name}</span><button type="button" aria-label="Hapus konteks berkas" className="ml-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedUpload(null)}>×</button></Badge></div>}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                      const value = e.target.value;
                      setInput(value);
                      const match = value.match(/(?:^|\s)@([^\s@]*)$/);
                      setMentionQuery(match ? match[1] : null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
                    aria-label="Pertanyaan untuk asisten data"
                    placeholder="Tulis pertanyaan..."
                    className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    disabled={sending}
                  />
                  <Button size="icon" className="shrink-0 rounded-xl" aria-label="Kirim pertanyaan" onClick={handleSend} disabled={sending || !input.trim()}><Send className="h-4 w-4" /></Button>
                </div>
                {mentionQuery !== null && <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border bg-background p-1">{filteredUploads.length === 0 ? <p className="px-2 py-1 text-xs text-muted-foreground">Berkas tidak ditemukan</p> : filteredUploads.slice(0, 8).map((upload) => <button type="button" key={upload.id} className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => setMentionFromUpload(upload)}>{upload.original_name}</button>)}</div>}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
