import { redirect } from "next/navigation";

export default function SupplierPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/supplier/${params.slug}/to-book`);
}
