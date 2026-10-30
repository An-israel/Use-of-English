import Image from "next/image";
import clsx from "clsx";
import { seedFrom } from "@/lib/weave";
import type { BookDetails } from "@/lib/types";

const GROUNDS = ["#2D3561", "#0F3B2E", "#7A2F1D", "#5B3A63", "#15130F", "#2F5563"];

/** The reviewed book's cover, or a typographic placeholder in a seeded colour. */
export function BookCover({ book, className }: { book: BookDetails; className?: string }) {
  if (book.coverUrl) {
    return (
      <div className={clsx("relative aspect-[2/3] overflow-hidden", className)}>
        <Image src={book.coverUrl} alt={`Cover of ${book.bookTitle}`} fill sizes="200px" className="object-cover" />
      </div>
    );
  }
  const ground = GROUNDS[seedFrom(book.bookTitle) % GROUNDS.length];
  const title = book.bookTitle.replace(/\s*\(SAMPLE\)$/, "");
  return (
    <div
      role="img"
      aria-label={`Cover of ${book.bookTitle} by ${book.bookAuthor}`}
      className={clsx(
        "relative flex aspect-[2/3] flex-col justify-between overflow-hidden p-[9%] text-[#F1E8D6]",
        className,
      )}
      style={{ backgroundColor: ground }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-[7%] w-px bg-[#C8962E]/60" />
      <span className="font-display pl-[8%] text-[clamp(0.85rem,1.2vw,1.1rem)] leading-tight">{title}</span>
      <span className="pl-[8%]">
        <span aria-hidden="true" className="mb-2 block size-2 rotate-45 bg-[#C8962E]" />
        <span className="smallcaps block text-[0.68rem] text-[#F1E8D6]/80">{book.bookAuthor}</span>
      </span>
    </div>
  );
}
