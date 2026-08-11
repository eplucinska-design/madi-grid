import { RouteBootstrap } from '@/components/route-bootstrap'

export function generateStaticParams() {
  return Array.from({ length: 12 }, (_, index) => ({ id: `demo-customer-${String(index + 1).padStart(4, '0')}` }))
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  return <RouteBootstrap module="customers" />
}
