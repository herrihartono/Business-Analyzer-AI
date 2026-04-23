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
        { role: "assistant", content: "Sorry, I couldn't process that question. Please try again." },
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
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-screen w-96 flex-col border-l bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Ask about your data</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Bot className="mx-auto mb-2 h-8 w-8" />
                    <p>Ask any question about your analysis data.</p>
                    <p className="mt-1 text-xs">Use @ to choose which uploaded file to discuss.</p>
                    <div className="mt-3 space-y-1 text-xs">
                      <p className="cursor-pointer hover:text-foreground" onClick={() => setInput("Give me a summary")}>
                        &quot;Give me a summary&quot;
                      </p>
                      <p className="cursor-pointer hover:text-foreground" onClick={() => setInput("What are the key metrics?")}>
                        &quot;What are the key metrics?&quot;
                      </p>
                      <p className="cursor-pointer hover:text-foreground" onClick={() => setInput("What do you recommend?")}>
                        &quot;What do you recommend?&quot;
                      </p>
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {sending && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              {selectedUpload ? (
                <div className="mb-2">
                  <Badge variant="secondary" className="gap-1">
                    Context: {selectedUpload.original_name}
                    <button
                      type="button"
                      className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedUpload(null)}
                    >
                      x
                    </button>
                  </Badge>
                </div>
              ) : null}
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
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your data... (type @ to choose file)"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  disabled={sending}
                />
                <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {mentionQuery !== null && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border bg-background p-1">
                  {filteredUploads.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No matching files</p>
                  ) : (
                    filteredUploads.slice(0, 8).map((upload) => (
                      <button
                        type="button"
                        key={upload.id}
                        className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                        onClick={() => setMentionFromUpload(upload)}
                      >
                        {upload.original_name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
