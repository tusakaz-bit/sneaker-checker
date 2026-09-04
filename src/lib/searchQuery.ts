export const SEARCH_KEYWORD_OVERRIDES: Record<string, string> = {
  // Converse
  "162972C": "PLAY COMME des GARCONS Chuck 70",
  "A03711C": "Stussy Converse Chuck 70",
  "1CL783": "Converse Addict N.HOOLYWOOD",

  // adidas
  "SAMBA-OG": "adidas Samba OG",
  "GAZELLE": "adidas Gazelle",
  "SPEZIAL": "adidas Handball Spezial",
  "YEEZY-350": "adidas Yeezy Boost 350 V2",

  // Asics
  "KAYANO14": "Asics GEL-KAYANO 14",
  "GT-2160": "Asics GT-2160",
  "GEL-NYC": "Asics GEL-NYC",
  "1201A256": "Asics GEL-1130",

  // HOKA
  "CLIFTON9": "HOKA Clifton 9",
  "BONDI8": "HOKA Bondi 8",
  "MACH6": "HOKA Mach 6",

  // New Balance
  "U9060": "New Balance 9060",
  "M2002R": "New Balance M2002R",
  "M990GY3": "New Balance 990v3",
  "M990GL6": "New Balance 990v6",
  "BB550BBB": "New Balance 550",
  "M1906R": "New Balance 1906",

  // Nike
  "CW2288-111": "Nike Air Force 1",
  "DD1391-100": "Nike Dunk Low", 
  "DZ5485-052": "Nike Air Jordan 1 High",
  "DZ2628-100": "Nike Air Max 1",
  "553558-065": "Nike Air Jordan 1 Low",
  "CT1689-001": "Nike Air Max 95",
  "FV5029": "Nike Air Jordan 4",
  "DD1391": "Nike SB Dunk Low",

  // On
  "3MD10420": "On Cloudsurfer",
  "26-99843": "On Cloudnova",
  "3M-101": "On Cloud 5",
  "61-99025": "On Cloudmonster",

  // Onitsuka Tiger
  "NIPPON-MADE": "Onitsuka Tiger NIPPON MADE",
  "DELECITY": "Onitsuka Tiger DELECITY",
  "L3108F-111": "Onitsuka Tiger MEXICO 66",

  // Salomon
  "L41709400": "Salomon XT-4",
  "L47179800": "Salomon ACS Pro",
  "L41085700": "Salomon XT-6",
  "L41743100": "Salomon Speedcross 6",

  // Puma
  "SPEEDCAT": "Puma Speedcat",
};

export function getRakutenSearchQuery(sneaker: { brand: string, model: string, style_code: string }) {
  if (SEARCH_KEYWORD_OVERRIDES[sneaker.style_code]) {
    return SEARCH_KEYWORD_OVERRIDES[sneaker.style_code];
  }
  return `${sneaker.brand} ${sneaker.model}`;
}
