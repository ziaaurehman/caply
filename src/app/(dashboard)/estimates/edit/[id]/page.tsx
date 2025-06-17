import EstimatePage from "@/components/pages/estimates/EstimatePage"

export default function EditEstimate({ params }: { params: { id: string } }) {
  return <EstimatePage editId={params.id} />
} 