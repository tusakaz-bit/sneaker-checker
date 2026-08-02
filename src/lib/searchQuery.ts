export const SEARCH_KEYWORD_OVERRIDES: Record<string, string> = {
  "SAMBA-OG": "adidas Samba OG",
  "GAZELLE": "adidas Gazelle",
  "SPEZIAL": "adidas Handball Spezial",
  "YEEZY-350": "adidas Yeezy Boost 350 V2",
  "KAYANO14": "Asics GEL-KAYANO 14",
  "GT-2160": "Asics GT-2160",
  "GEL-NYC": "Asics GEL-NYC",
  "CLIFTON9": "HOKA Clifton 9",
  "BONDI8": "HOKA Bondi 8",
  "MACH6": "HOKA Mach 6",
  "M2002R": "New Balance M2002R",
  "M990GY3": "New Balance 990v3",
  "M990GL6": "New Balance 990v6",
  "BB550BBB": "New Balance 550 BB550BBB",
  "M1906R": "New Balance 1906R",
  "CW2288-111": "Nike Air Force 1 CW2288-111",
  "DD1391-100": "Nike Dunk Low DD1391-100", 
  "DZ5485-052": "Nike Air Jordan 1 High DZ5485-052",
  "DZ2628-100": "Nike Air Max 1 DZ2628-100",
  "553558-065": "Nike Air Jordan 1 Low 553558-065",
  "CT1689-001": "Nike Air Max 95 CT1689-001",
  "3MD10420": "On Cloudsurfer",
  "26-99843": "On Cloudnova",
  "3M-101": "On Cloud 5",
  "61-99025": "On Cloudmonster",
  "NIPPON-MADE": "Onitsuka Tiger NIPPON MADE",
  "DELECITY": "Onitsuka Tiger DELECITY",
  "L3108F-111": "Onitsuka Tiger MEXICO 66",
  "L41709400": "Salomon XT-4",
  "L47179800": "Salomon ACS Pro",
  "L41085700": "Salomon XT-6",
  "L41743100": "Salomon Speedcross 6",
};

export function getRakutenSearchQuery(sneaker: { brand: string, model: string, style_code: string }) {
  let baseQuery = '';
  if (SEARCH_KEYWORD_OVERRIDES[sneaker.style_code]) {
    baseQuery = SEARCH_KEYWORD_OVERRIDES[sneaker.style_code];
  } else {
    baseQuery = `${sneaker.brand} ${sneaker.model}`;
  }
  
  // 型番が含まれていなければ末尾に追加
  if (!baseQuery.includes(sneaker.style_code)) {
    return `${baseQuery} ${sneaker.style_code}`;
  }
  
  return baseQuery;
}
