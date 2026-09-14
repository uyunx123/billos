/* ------------------------------------------------------------------ */
/* Payment gateway catalog — the "available to connect" list           */
/* ------------------------------------------------------------------ */
/* Each entry drives the step-by-step wizard in the admin console:     */
/*   overview → fields → (picture) → (test) → done                     */
/* Field `secret: true` values are stored in the private `config`      */
/* column (readable only server-side); everything else lands in        */
/* `public_config` and is safe to show at checkout.                    */
/* ------------------------------------------------------------------ */

export type GatewayType = "api" | "manual" | "cod";

export interface GatewayField {
  key: string;
  label: string;
  kind: "text" | "password" | "select" | "textarea" | "picture";
  required: boolean;
  placeholder?: string;
  hint?: string;
  options?: string[];
  /** true → credential, stored in the private config column */
  secret?: boolean;
}

export interface GatewayStep {
  id: string;
  title: string;
  description: string;
  fields: GatewayField[];
}

export interface GatewayCatalogEntry {
  slug: string;
  name: string;
  type: GatewayType;
  tagline: string;
  description: string;
  /** Shown on the overview step as the "you'll need" checklist. */
  needs: string[];
  steps: GatewayStep[];
  /** API gateways get a live connection-test step before saving. */
  canTest: boolean;
}

export const GATEWAY_CATALOG: GatewayCatalogEntry[] = [
  {
    slug: "midtrans",
    name: "Midtrans (Snap)",
    type: "api",
    tagline: "QRIS, bank transfer, e-wallets and cards in one checkout.",
    description:
      "Redirects customers to Midtrans Snap, locked to the payment channel they picked at checkout. When connected, the store creates a real Snap transaction for every order.",
    needs: [
      "Midtrans Server Key (Settings → Access Keys)",
      "Merchant ID from your Midtrans dashboard",
      "Sandbox or production environment",
    ],
    canTest: true,
    steps: [
      {
        id: "credentials",
        title: "API credentials",
        description: "Paste the credentials from your Midtrans dashboard. Keys are stored securely server-side — never sent to your browser after saving.",
        fields: [
          { key: "display_name", label: "Display name", kind: "text", required: true, placeholder: "Midtrans (Snap)" },
          { key: "server_key", label: "Server key", kind: "password", required: true, secret: true, hint: "Starts with SB-Mid-server-… (sandbox) or Mid-server-… (production)." },
          { key: "merchant_id", label: "Merchant ID", kind: "text", required: true, secret: true, placeholder: "G123456789" },
          {
            key: "environment",
            label: "Environment",
            kind: "select",
            required: true,
            secret: true,
            options: ["sandbox", "production"],
            hint: "Sandbox = test payments. Switch to production only when you're ready to accept real money.",
          },
        ],
      },
    ],
  },
  {
    slug: "xendit",
    name: "Xendit",
    type: "api",
    tagline: "Bank transfers, e-wallets, cards and more across SEA.",
    description:
      "Connect your Xendit account so the store can create hosted payment invoices for your customers.",
    needs: ["Xendit API key (Settings → API Keys)"],
    canTest: true,
    steps: [
      {
        id: "credentials",
        title: "API key",
        description: "Paste your Xendit API key. It's stored securely server-side.",
        fields: [
          { key: "display_name", label: "Display name", kind: "text", required: true, placeholder: "Xendit" },
          { key: "api_key", label: "API key", kind: "password", required: true, secret: true, hint: "Starts with xnd_development_… or xnd_production_…" },
        ],
      },
    ],
  },
  {
    slug: "stripe",
    name: "Stripe",
    type: "api",
    tagline: "Global cards & wallets via Stripe Payment Links.",
    description:
      "Connect your Stripe account so the store can create hosted payment pages for card payments.",
    needs: ["Stripe Secret key (Developers → API keys)"],
    canTest: true,
    steps: [
      {
        id: "credentials",
        title: "API key",
        description: "Paste your Stripe secret key. It's stored securely server-side.",
        fields: [
          { key: "display_name", label: "Display name", kind: "text", required: true, placeholder: "Stripe — card" },
          { key: "secret_key", label: "Secret key", kind: "password", required: true, secret: true, hint: "Starts with sk_test_… or sk_live_…" },
        ],
      },
    ],
  },
  {
    slug: "bank_transfer",
    name: "Bank transfer",
    type: "manual",
    tagline: "Customers pay straight into your account — you confirm manually.",
    description:
      "A manual method: the customer sees your account details and instructions at checkout, pays from their bank app, then you confirm the payment in the Orders tab.",
    needs: ["Account holder name", "Account number", "Bank name", "Payment instructions"],
    canTest: false,
    steps: [
      {
        id: "details",
        title: "Account details",
        description: "Mandatory details shown to customers when they pick this method at checkout.",
        fields: [
          { key: "display_name", label: "Display name", kind: "text", required: true, placeholder: "Bank transfer (BCA)" },
          { key: "account_name", label: "Account holder name", kind: "text", required: true, placeholder: "PT ISAK Billiard Indonesia" },
          { key: "account_number", label: "Account number", kind: "text", required: true, placeholder: "8830 1234 567" },
          { key: "bank_name", label: "Bank / e-wallet name", kind: "text", required: true, placeholder: "BCA · BNI · BRI · Mandiri · GoPay" },
          {
            key: "instructions",
            label: "Payment instructions",
            kind: "textarea",
            required: true,
            placeholder: "1. Transfer the order total to the account above\n2. Keep the receipt\n3. We confirm your payment and ship",
          },
        ],
      },
      {
        id: "picture",
        title: "Supporting picture (optional)",
        description: "An optional image — e.g. your bank logo or a transfer example — shown alongside the instructions.",
        fields: [{ key: "picture", label: "Picture", kind: "picture", required: false, hint: "JPG or PNG, resized automatically. Leave empty to show text only." }],
      },
    ],
  },
  {
    slug: "qris",
    name: "QRIS",
    type: "manual",
    tagline: "Scan-to-pay with any e-wallet or bank app.",
    description:
      "A manual method: customers scan your QRIS QR code and pay from GoPay, OVO, ShopeePay, DANA or any bank app, then you confirm the payment.",
    needs: ["Merchant / account name", "A QRIS QR code image (required)", "Payment instructions"],
    canTest: false,
    steps: [
      {
        id: "details",
        title: "QRIS details",
        description: "Mandatory details shown to customers who pick QRIS at checkout.",
        fields: [
          { key: "display_name", label: "Display name", kind: "text", required: true, placeholder: "QRIS (all e-wallets & bank apps)" },
          { key: "account_name", label: "Merchant / account name", kind: "text", required: true, placeholder: "ISAK Billiard Co." },
          { key: "account_number", label: "QRIS merchant ID", kind: "text", required: false, placeholder: "ID1020 8912 3456 7890" },
          {
            key: "instructions",
            label: "Payment instructions",
            kind: "textarea",
            required: true,
            placeholder: "1. Open any e-wallet or bank app\n2. Scan the QR code below\n3. Enter the order total and pay\n4. We confirm your payment and ship",
          },
        ],
      },
      {
        id: "picture",
        title: "QRIS code",
        description: "Upload the QR code your customers will scan. This is required to activate QRIS.",
        fields: [{ key: "picture", label: "QRIS QR code image", kind: "picture", required: true, hint: "Upload your QRIS QR code (JPG/PNG). It's resized automatically." }],
      },
    ],
  },
  {
    slug: "cod",
    name: "Cash on delivery",
    type: "cod",
    tagline: "Pay the courier when the order arrives at your door.",
    description:
      "A manual method: the customer pays in cash when the package is delivered. You confirm the payment on delivery.",
    needs: ["Payment instructions for the customer"],
    canTest: false,
    steps: [
      {
        id: "details",
        title: "COD details",
        description: "Mandatory instructions shown to customers who pick COD at checkout.",
        fields: [
          { key: "display_name", label: "Display name", kind: "text", required: true, placeholder: "Cash on delivery" },
          {
            key: "instructions",
            label: "Instructions",
            kind: "textarea",
            required: true,
            placeholder: "Pay the courier in cash when your order arrives. Please have the exact amount ready.",
          },
        ],
      },
    ],
  },
];

export function getGatewayCatalog(slug: string): GatewayCatalogEntry | undefined {
  return GATEWAY_CATALOG.find((g) => g.slug === slug);
}

export const GATEWAY_TYPE_LABEL: Record<GatewayType, string> = {
  api: "API gateway",
  manual: "Manual",
  cod: "COD",
};