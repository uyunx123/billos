export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readMinutes: number;
  author: string;
  image: string;
  content: string[];
  /** Optional embedded video (YouTube, Vimeo or a direct .mp4/.webm link). */
  videoUrl?: string;
}

export const POSTS: BlogPost[] = [
  {
    slug: "choose-your-first-cue",
    title: "How to Choose Your First Cue Stick",
    excerpt:
      "Weight, taper, tip size - the four things that matter and the three that don't. First-cue advice without the jargon.",
    date: "2025-11-04",
    category: "Buying Guides",
    readMinutes: 6,
    author: "Raka Wijaya",
    image: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/cue.jpg",
    content: [
      "Buying your first cue is one of the tone points in a player's journey. Shop around long enough and you'll hear thirty different opinions, most of them conflicting. Here is the version you can trust.",
      "Start with weight. Most players feel at home between 18 and 19 ounces. Lighter cues suit a striker style, heavier ones give you more authority on the break. Ask to hold the two weights before you buy - feel on it matters more than any spec sheet.",
      "Next, the taper and the tip. A pro taper keeps the shaft slim for smooth release; a conic taper gives you a hair more feed. Tip diameter 12.5-13mm is the sensible middle ground for a first cue.",
      "Finally ignore the gimmicks. A fancy wrap will not make you pot better. Buy a cue that feels balanced in your hand, and you have earned years of growth with it.",
    ],
  },
  {
    slug: "jakarta-open-2025-wrapup",
    title: "Jakarta Open 2025 - As It Happened",
    excerpt:
      "Three days, one trophy, and a final that went the distance. A full wrap-up of the first major hosted at our home club.",
    date: "2025-10-21",
    category: "Events",
    readMinutes: 5,
    author: "Nadia Kusuma",
    image: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/balls.jpg",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    content: [
      "112 players, sixty tables, and one unforgettable weekend. Jakarta Open 2025 brought the best of the island together under one roof, and the standard was higher than ever.",
      "The main draw ran over nineteen length tight. Local favorite Andi Pratama read the table for the opening weekend and carried that confidence into the break shot final, which he closed out 11-9.",
      "Behind the winner, the story was growth: half the field was below 25 years old, and four of the eight quarterfinalists were first-time pro tour players.",
    ],
  },
  {
    slug: "feel-vs-felt-care",
    title: "The Table Owner's Monthly Routine",
    excerpt:
      "How much trims off your felt lifetime, how to brush, and the one stain that costs you the table surface.",
    date: "2025-09-30",
    category: "Care & Maintenance",
    readMinutes: 4,
    author: "Raka Wijaya",
    image: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/accessories.jpg",
    content: [
      "A piece of felt is the most-touched surface you own, and it rarely gets the routine it deserves. Start with brushing along the nap, morning shift, before every long session.",
      "Crotch crisps and chalking dust should never stay overnight. They grind into fibers and change how the tip contacts the cloth, which you feel as unpredictable rolls.",
      "Once every few months, brush top-down, clockwise, and into light. Never push the cleaner in the opposite of the nap direction - that single habit destroys more cloths than heavy play ever does.",
    ],
  },
  {
    slug: "chalking-like-a-pro",
    title: "The 9-Second Chalking Ritual",
    excerpt:
      "Most players strip chalk on as an afterthought. Here's the ritual that keeps your tip dome clean every single shot.",
    date: "2025-08-30",
    category: "Tips",
    readMinutes: 3,
    author: "Nadia Kusuma",
    image: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/accessories.jpg",
    content: [
      "Chalk is not a decoration. It is the friction layer between your tip and the ball, and when it is gone you eligible miscues.",
      "The pro ritual: hold the cube at an angle, sweep the tip from the outer edge to the center in one light motion, and do the same from the opposite side. A full 360 takes about nine seconds.",
      "Do this after every shot, not when the tip starts to slip. Your game will change more than any new cue stick can.",
    ],
  },
];