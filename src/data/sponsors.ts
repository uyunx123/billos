export interface Sponsor {
  id: string;
  name: string;
  href: string;
  /** Image path or external URL for the sponsor banner. */
  image?: string;
  active: boolean;
}

/** Official sponsorships shown on the homepage sponsorship strip. */
export const SPONSORS: Sponsor[] = [
  {
    id: "jakarta-billiards-league",
    name: "Jakarta Billiards League",
    href: "https://www.instagram.com/",
    image: "/sponsors/jakarta-billiards-league.svg",
    active: true,
  },
  {
    id: "kipas-kuning-sport",
    name: "Kipas Kuning Sport Arena",
    href: "https://www.instagram.com/",
    image: "/sponsors/kipas-kuning-sport.svg",
    active: true,
  },
  {
    id: "senayan-billiard-hall",
    name: "Senayan Billiard Hall",
    href: "https://www.instagram.com/",
    image: "/sponsors/senayan-billiard-hall.svg",
    active: true,
  },
  {
    id: "liga-9ball-ina",
    name: "Liga 9-Ball Indonesia",
    href: "https://www.instagram.com/",
    image: "/sponsors/liga-9ball-indonesia.svg",
    active: false,
  },
  {
    id: "predator",
    name: "Predator Cues",
    href: "https://www.predatorcues.com",
    image: "/sponsors/predator.svg",
    active: true,
  },
  {
    id: "murrey",
    name: "Murrey",
    href: "https://www.murrey.com",
    image: "/sponsors/murrey.svg",
    active: true,
  },
  {
    id: "aramith",
    name: "Aramith",
    href: "https://aramith.com",
    image: "/sponsors/aramith.svg",
    active: true,
  },
];