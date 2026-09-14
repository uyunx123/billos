import { useMemo } from "react";

/** Renders a JSON-LD structured-data block (Product, BreadcrumbList, …). */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = useMemo(() => JSON.stringify(data), [data]);
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}