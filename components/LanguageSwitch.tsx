"use client";

import { usePathname } from "next/navigation";
import { setLanguage } from "@/lib/actions";
import { dictionary, type Lang } from "@/lib/i18n";

export function LanguageSwitch({ lang }: { lang: Lang; next?: string }) {
  const t = dictionary(lang);
  const path = usePathname() || "/";
  return (
    <form action={setLanguage} className="lang">
      <input type="hidden" name="next" value={path} />
      <button className="quiet" name="lang" value="en" type="submit" aria-current={lang === "en" ? "true" : undefined}>
        {t.english}
      </button>
      <button className="quiet" name="lang" value="ar" type="submit" aria-current={lang === "ar" ? "true" : undefined}>
        {t.arabic}
      </button>
    </form>
  );
}
