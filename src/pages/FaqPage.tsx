import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card, EmptyState } from "../components/ui";
import { useConfig } from "../context/ConfigContext";

export function FaqPage() {
  const { faq } = useConfig();
  const [open, setOpen] = useState<string | null>(null);

  const items = faq
    .filter((f) => f.enabled && f.question.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold">Frequently asked questions</h1>
        <p className="mt-1 text-muted">Everything you need to know before you order.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="h-8 w-8" />}
          title="No FAQs yet"
          message="Questions and answers will appear here soon."
        />
      ) : (
        <div className="space-y-3">
          {items.map((f) => {
            const isOpen = open === f.id;
            return (
              <Card key={f.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer transition-colors duration-150 hover:bg-surface-2"
                >
                  <span className="font-semibold text-foreground">{f.question}</span>
                  <span
                    className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-5 py-4 text-sm text-muted">
                    {f.answer}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
