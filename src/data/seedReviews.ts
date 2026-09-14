import type { ProductReview } from "../context/ReviewContext";

/**
 * Starter verified-purchase reviews so the homepage review summary, photo wall
 * and product pages feel alive on first load. Stored in the same localStorage
 * bucket as user-submitted reviews (only when that bucket is empty).
 */
export const SEED_REVIEWS: ProductReview[] = [
  {
    id: "rev-seed-01",
    orderId: "ISAK-81234-88",
    productId: "prod-01",
    author: "Andi Pratama",
    rating: 5,
    comment:
      "The Revo shaft is ridiculously stable — zero deflection on power shots. Balanced 19oz out of the box and the wrap feels premium. Packed tip-first with the joint protector on, arrived flawless.",
    media: [{ kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/cue.jpg" }],
    at: "2026-08-18T09:24:00.000Z",
  },
  {
    id: "rev-seed-02",
    orderId: "ISAK-81201-42",
    productId: "prod-03",
    author: "Rina Kusuma",
    rating: 5,
    comment:
      "TS8 Artisan is a work of art — ebony and maple splice is clean and the carbon shaft plays like a dream. Used it for a league night right away and broke a personal best. Highly recommended.",
    media: [
      { kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/cue.jpg" },
      { kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/table.jpg" },
    ],
    at: "2026-07-30T14:02:00.000Z",
  },
  {
    id: "rev-seed-03",
    orderId: "ISAK-81177-31",
    productId: "prod-10",
    author: "Nuraini Sari",
    rating: 5,
    comment:
      "Murrey Lexington 7-ft installed in my game room — the crew levelled it perfectly and the slate rolls true. The cloth is faster than I expected in a great way. Worth every rupiah.",
    media: [{ kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/table.jpg" }],
    at: "2026-07-12T06:51:00.000Z",
  },
  {
    id: "rev-seed-04",
    orderId: "ISAK-81150-19",
    productId: "prod-24",
    author: "Rafi Maulana",
    rating: 4,
    comment:
      "Roadline 3x5 case is tough as advertised — survived two tournament trips stuffed in the car boot. Zippers are smooth and the interior keeps my shafts snug. Only wish it had a shoulder strap.",
    media: [{ kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/accessories.jpg" }],
    at: "2026-06-25T11:37:00.000Z",
  },
  {
    id: "rev-seed-05",
    orderId: "ISAK-81123-07",
    productId: "prod-44",
    author: "Ayu Lestari",
    rating: 5,
    comment:
      "Kamui glove fits like a second skin — quick-dry fabric keeps my bridge smooth through long sessions. Ordering a second one for the match bag.",
    media: [{ kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/glove.jpg" }],
    at: "2026-06-09T03:18:00.000Z",
  },
  {
    id: "rev-seed-06",
    orderId: "ISAK-81096-55",
    productId: "prod-32",
    author: "Budi Santoso",
    rating: 4,
    comment:
      "Diamond ball set rolls beautifully — crisp, heavy and well polished. Colours pop under the table light. One ball had a tiny mould line but it doesn't affect play at all.",
    media: [
      { kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/balls.jpg" },
      { kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/table.jpg" },
    ],
    at: "2026-05-21T08:44:00.000Z",
  },
  {
    id: "rev-seed-07",
    orderId: "ISAK-81070-23",
    productId: "prod-05",
    author: "Dimas Anggara",
    rating: 5,
    comment:
      "BK Rush break cue hits like a truck — the carbon shaft transfers everything. My rack spread improved dramatically at club night. Delivery was quick and well packed.",
    media: [{ kind: "image", dataUrl: "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/cue.jpg" }],
    at: "2026-05-03T16:20:00.000Z",
  },
  {
    id: "rev-seed-08",
    orderId: "ISAK-81041-67",
    productId: "prod-28",
    author: "Sinta Dewi",
    rating: 5,
    comment:
      "Champion LE-24 is the best value cue I've owned — solid maple shaft, nice weight and a great feel for the price. Perfect first competition cue for my students.",
    media: [],
    at: "2026-04-17T02:55:00.000Z",
  },
];