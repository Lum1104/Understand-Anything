import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  zh: "中文",
};

export function LanguagePicker() {
  const { i18n } = useTranslation();

  const currentLang = SUPPORTED_LANGUAGES.includes(
    i18n.language as SupportedLanguage
  )
    ? (i18n.language as SupportedLanguage)
    : "en";

  return (
    <select
      value={currentLang}
      onChange={(e) => {
        const lang = e.target.value as SupportedLanguage;
        i18n.changeLanguage(lang);
        localStorage.setItem("understand-anything-language", lang);
      }}
      className="px-2 py-1.5 rounded-md text-xs font-medium bg-elevated text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border-subtle"
      title="Switch language"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]}
        </option>
      ))}
    </select>
  );
}