import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Lang } from '../lib/i18n';
import { tr } from '../lib/i18n';

interface LangCtx { lang: Lang; toggle: () => void; t: (key: string) => string; isRTL: boolean; }
const LangContext = createContext<LangCtx>({} as LangCtx);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>((localStorage.getItem('lang') as Lang) || 'en');
  const isRTL = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
  }, [lang, isRTL]);

  const toggle = () => setLang(l => l === 'en' ? 'ar' : 'en');
  const t = (key: string) => tr(key, lang);

  return <LangContext.Provider value={{ lang, toggle, t, isRTL }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
