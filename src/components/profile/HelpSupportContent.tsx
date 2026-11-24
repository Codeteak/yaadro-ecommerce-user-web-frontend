"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { BrandFooter } from "@/components/storefront/BrandFooter";
import type { ShopSupportContact } from "@/lib/sample-shop-support";
import { cn } from "@/lib/cn";

type HelpSupportContentProps = {
  contact: ShopSupportContact;
  backHref?: string;
  /** Prefer over `backHref` when returning via nav stack (#33). */
  onBackClick?: () => void;
  className?: string;
  /** Remap FAQ deep-links in playground demos. */
  topicHrefFor?: (href: HelpTopicHref) => string;
  /**
   * Phase D #33 — open a FAQ by topic id (`price` → “Why might the price change?”).
   */
  initialTopic?: string | null;
};

export type HelpTopicHref = "/orders" | "/coupons" | "/profile?address=1";

type FaqEntry = {
  question: string;
  answer: string;
  /** Deep-link topic id (e.g. `price` for #33). */
  topic?: string;
  link?: { href: HelpTopicHref; label: string };
};

const FAQS: FaqEntry[] = [
  {
    question: "How can I track my order?",
    answer:
      "Open Orders to see status, delivery progress, and past deliveries for this shop.",
    link: { href: "/orders", label: "Go to Orders" },
  },
  {
    question: "How can I apply a coupon?",
    answer:
      "Add items to your cart, then apply a coupon before checkout. You need to be signed in.",
    link: { href: "/coupons", label: "See Coupons" },
  },
  {
    question: "How do I update my address?",
    answer:
      "Add, edit, or set a default drop-off so deliveries go to the right place.",
    link: { href: "/profile?address=1", label: "Delivery address" },
  },
  {
    question: "Is cash on delivery available?",
    answer:
      "Yes. Orders are paid when they arrive. Card and UPI aren’t available yet.",
  },
  {
    topic: "price",
    question: "Why might the price change?",
    answer:
      "The shop may update the selling price after you add an item, and weighted items are billed by the final packed weight — so the amount can differ slightly from the cart.",
  },
];

function faqIndexForTopic(topic: string | null | undefined): number | null {
  if (!topic) return null;
  const index = FAQS.findIndex((faq) => faq.topic === topic);
  return index >= 0 ? index : null;
}

function ContactAction({
  href,
  label,
  iconSrc,
  iconSize = 36,
  external,
}: {
  href: string;
  label: string;
  iconSrc: string;
  iconSize?: number;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : undefined)}
      className="group flex min-w-0 flex-1 flex-col items-center gap-2.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    >
      <Image
        src={iconSrc}
        alt=""
        width={iconSize}
        height={iconSize}
        unoptimized
        className="object-contain transition group-active:scale-95"
        style={{ width: iconSize, height: iconSize }}
      />
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </a>
  );
}

function FaqItem({
  question,
  answer,
  link,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  link?: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "-mx-2 rounded-2xl border-b border-forest/10 px-2 transition-[background-color,box-shadow] duration-300 last:border-b-0",
        open && "border-b-transparent bg-mint/35 shadow-[0_4px_14px_rgba(47,107,47,0.06)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <span className="min-w-0 flex-1 text-[14px] font-semibold text-ink">
          {question}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted transition-transform duration-300 ease-out",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "pb-3.5 transition-[opacity,transform] duration-300 ease-out",
              open
                ? "translate-y-0 opacity-100"
                : "-translate-y-1 opacity-0",
            )}
          >
            <p className="text-[13px] leading-5 text-muted">{answer}</p>
            {link ? <div className="mt-2">{link}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Help & Support (#15): title with support icon, Contact us
 * (Call / WhatsApp / Location), FAQ with order/coupon/address help.
 */
export function HelpSupportContent({
  contact,
  backHref = "/profile",
  onBackClick,
  className,
  topicHrefFor,
  initialTopic = null,
}: HelpSupportContentProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(
    () => faqIndexForTopic(initialTopic) ?? 0,
  );
  const [contactDetailsOpen, setContactDetailsOpen] = useState(false);
  const canCall = Boolean(contact.phoneTel);
  const canWhatsapp = Boolean(contact.whatsappNumber);
  const addressLines = contact.addressLines.filter(Boolean);
  const addressQuery = addressLines.join(", ");
  const mapsHref =
    contact.mapsHref ??
    (addressQuery
      ? `https://maps.google.com/?q=${encodeURIComponent(addressQuery)}`
      : "");
  const canLocate = Boolean(mapsHref);
  const showContact = canCall || canWhatsapp || canLocate;
  const hasDetails = Boolean(contact.phone || addressLines.length > 0);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-paper",
        className,
      )}
    >
      <div className="px-5">
        <PageHeader
          backHref={onBackClick ? undefined : backHref}
          onBackClick={onBackClick}
          title="Help & Support"
        />
      </div>

      <div className="flex flex-1 flex-col gap-8 px-5 pt-2 pb-10">
        <header className="flex items-start gap-3">
          <Image
            src="/icons/support.png"
            alt=""
            width={40}
            height={40}
            unoptimized
            className="mt-0.5 size-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h1 className="text-[24px] leading-tight font-extrabold tracking-tight text-black">
              We’re here to help
            </h1>
            <p className="mt-1.5 text-[14px] leading-5 text-muted">
              Questions about {contact.shopName} orders, offers, or delivery —
              {showContact
                ? " reach the store or browse the answers below."
                : " browse the answers below."}
            </p>
          </div>
        </header>

        {showContact ? (
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-black">Contact us</h2>
              {hasDetails ? (
                <button
                  type="button"
                  onClick={() => setContactDetailsOpen((open) => !open)}
                  aria-expanded={contactDetailsOpen}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold text-black transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  Details
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-3.5 text-black transition-transform duration-300 ease-out",
                      contactDetailsOpen && "rotate-180",
                    )}
                  />
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              Call, WhatsApp, or open the store location.
            </p>
            <div className="mt-5 flex items-start gap-2">
              {canCall ? (
                <ContactAction
                  href={`tel:${contact.phoneTel}`}
                  label="Call"
                  iconSrc="/icons/call.png"
                  iconSize={40}
                />
              ) : null}
              {canWhatsapp ? (
                <ContactAction
                  href={`https://wa.me/${contact.whatsappNumber}`}
                  label="WhatsApp"
                  iconSrc="/icons/whatsapp.svg"
                  iconSize={40}
                  external
                />
              ) : null}
              {canLocate ? (
                <ContactAction
                  href={mapsHref}
                  label="Location"
                  iconSrc="/icons/location.svg"
                  iconSize={42}
                  external
                />
              ) : null}
            </div>

            {hasDetails ? (
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  contactDetailsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={cn(
                      "mt-4 rounded-2xl bg-mint/35 px-3.5 py-3 transition-[opacity,transform] duration-300 ease-out",
                      contactDetailsOpen
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-1 opacity-0",
                    )}
                  >
                    <p className="text-[13px] font-bold text-black">
                      {contact.shopName}
                    </p>
                    {contact.phone ? (
                      canCall ? (
                        <a
                          href={`tel:${contact.phoneTel}`}
                          className="mt-1.5 block text-[14px] font-semibold tabular-nums text-forest underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                        >
                          {contact.phone}
                        </a>
                      ) : (
                        <p className="mt-1.5 text-[14px] font-semibold tabular-nums text-forest">
                          {contact.phone}
                        </p>
                      )
                    ) : null}
                    {addressLines.length > 0 ? (
                      <p className="mt-1.5 text-[13px] leading-5 text-muted">
                        {addressLines.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section>
          <h2 className="text-base font-extrabold text-black">
            Frequently asked questions
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Track an order, use a coupon, update your address, and more.
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {FAQS.map((faq, index) => (
              <FaqItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
                open={openFaq === index}
                onToggle={() =>
                  setOpenFaq((current) => (current === index ? null : index))
                }
                link={
                  faq.link ? (
                    <Link
                      href={
                        topicHrefFor
                          ? topicHrefFor(faq.link.href)
                          : faq.link.href
                      }
                      className="text-[13px] font-semibold text-forest underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                    >
                      {faq.link.label}
                    </Link>
                  ) : undefined
                }
              />
            ))}
          </div>
        </section>
      </div>

      <BrandFooter />
    </div>
  );
}
