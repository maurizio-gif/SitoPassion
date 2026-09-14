// Voci di menu: cambia raramente e richiede un ordine preciso, non serve editabile da CMS.
// Se in futuro servisse editabile, promuovere a settings/nav.json (Decap + content collection).
// Raggruppate sotto due dropdown (Palestra, Discipline) invece di 11 voci piatte in fila:
// la sitemap reale ha molte pagine di primo livello, ma in un menu bold/compatto vanno
// organizzate per non affollare l'header.
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
  // Riga d'invito sotto il titolo nel riquadro del menu mobile: dice cosa si
  // trova girando la card (vedi Nav.astro).
  tagline?: string;
  // Voce fuori dalla griglia del menu mobile: occupa una fascia a se' a
  // piena larghezza sotto i riquadri (vedi Nav.astro).
  standalone?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Palestra",
    href: "/palestra/",
    tagline: "Scegli la tua attività",
    children: [
      { label: "Sala Pesi", href: "/palestra/sala-pesi/" },
      { label: "Corsi Fitness", href: "/palestra/corsi-fitness/" },
    ],
  },
  {
    label: "Discipline",
    href: "/orari-corsi/",
    tagline: "Scegli la tua disciplina",
    children: [
      { label: "Hyrox", href: "/hyrox/" },
      { label: "Personal Training", href: "/personal-training/" },
      { label: "Pilates Reformer", href: "/pilates-reformer/" },
    ],
  },
  {
    label: "Orari Corsi",
    href: "/orari-corsi/",
    tagline: "Guarda l'orario della tua attività",
    // Ancore ai singoli planning della pagina Orari Corsi (gli id sono
    // impostati sui ScheduleSection in orari-corsi.mdx).
    children: [
      { label: "Reformer Club", href: "/orari-corsi/#reformer-club" },
      { label: "Reform Plus", href: "/orari-corsi/#studio-reform-plus" },
      { label: "Corsi Energy", href: "/orari-corsi/#corsi-energy" },
      { label: "Corsi Rebalance", href: "/orari-corsi/#corsi-rebalance" },
      { label: "Formula 8", href: "/orari-corsi/#formula-8" },
    ],
  },
  {
    label: "Abbonamenti",
    href: "/abbonamenti/",
    tagline: "Scegli il tuo abbonamento",
    // Ancore ai gruppi di abbonamento (id sui PricingGroup in abbonamenti.mdx).
    children: [
      { label: "Open", href: "/abbonamenti/#open" },
      { label: "Sala Pesi + Corsi", href: "/abbonamenti/#sala-pesi-corsi-fitness" },
      { label: "Sala Pesi", href: "/abbonamenti/#sala-pesi" },
      { label: "Formula 8", href: "/abbonamenti/#formula-8" },
      { label: "PT Elite", href: "/abbonamenti/#pt-elite" },
      { label: "Under 25", href: "/abbonamenti/#under-25" },
    ],
  },
  { label: "Blog", href: "/blog/", standalone: true },
];
