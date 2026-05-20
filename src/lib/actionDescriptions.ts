/** Expand action title into a non-duplicative description for fallback plans. */
export function describeActionStep(title: string): string {
  const t = title.toLowerCase();
  if (/mdcp|geodet|mapa do celów/i.test(t)) {
    return "Zlecić pomiad geodezyjny i opracować mapę do celów projektowych — podstawa PZT i uzgodnień z organem.";
  }
  if (/geotechniczn/i.test(t)) {
    return "Wykonać rozpoznanie gruntu i opinię geotechniczną przed zamrożeniem fundamentów i konstrukcji.";
  }
  if (/wypis|mpzp/i.test(t)) {
    return "Uzyskać wypis i wyrys z MPZP (lub pełną treść uchwały z załącznikiem graficznym) i zweryfikować parametry zabudowy.";
  }
  if (/warunki|wz/i.test(t)) {
    return "Przy braku MPZP — przygotować wniosek o warunki zabudowy jako podstawę parametrów lokalizacji.";
  }
  if (/brief inwestora|wytyczne inwestora/i.test(t)) {
    return "Zebrać program funkcjonalny, standard, harmonogram i wymagania specjalne inwestora przed koncepcją.";
  }
  if (/brief technologiczn/i.test(t)) {
    return "Uzyskać brief technologiczny (linie, media procesowe, obciążenia) przed koncepcją architektoniczną.";
  }
  if (/tir|plac manewrow|doki|ruch samochodów ciężarowych/i.test(t)) {
    return "Zweryfikować zjazd, manewrowanie TIR, doki załadunkowe i szerokości dróg wewnętrznych w relacji do MPZP i PZT.";
  }
  if (/media|wody opadow|odwodnien/i.test(t)) {
    return "Ustalić zapotrzebowanie na przyłącza mediów oraz sposób odprowadzenia wód opadowych i roztopowych z placu i dachu.";
  }
  if (/konstrukcj|fundament|posadzk/i.test(t)) {
    return "Określić założenia konstrukcyjne hali, nośność posadzki pod regały wysokiego składowania oraz układ fundamentów po opinii geotechnicznej.";
  }
  if (/magazyn|składowan|regał/i.test(t)) {
    return "Ustalić wysokość składowania, obciążenia posadzki, plac manewrowy TIR i wymagania PPOŻ dla hali.";
  }
  if (/inwentaryzac/i.test(t)) {
    return "Udokumentować istniejący stan architektoniczny i instalacyjny przed projektem rozbudowy lub zmiany użytkowania.";
  }
  if (/ppoż|pożar/i.test(t)) {
    return "Wczesna koordynacja przeciwpożarowa z układem funkcji i drogami ewakuacji / dojazdu.";
  }
  if (/pzt|pab/i.test(t)) {
    return "Opracować lub zaktualizować dokumentację zagospodarowania i architektoniczną po ustaleniu podstaw planistycznych.";
  }
  if (/koncepcj/i.test(t)) {
    return "Przygotować wariant koncepcyjny po zebraniu danych wejściowych i briefu inwestora.";
  }
  if (/formaln|pnb|zgłoszenie/i.test(t)) {
    return "Potwierdzić tryb formalny (pozwolenie na budowę lub zgłoszenie) dla zakresu robót i etapu dokumentacji.";
  }
  return `${title} — do wykonania na obecnym etapie procesu projektowego z koordynacją branżową.`;
}
