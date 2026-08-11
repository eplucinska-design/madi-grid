import { OrderWorkWindow } from '@/components/orders/order-work-window'

export function generateStaticParams() {
  return ['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => ({ id }))
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderWorkWindow orderId={id} />
}
