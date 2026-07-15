import { OrderWorkWindow } from '@/components/orders/order-work-window'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderWorkWindow orderId={id} />
}
