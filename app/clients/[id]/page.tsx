import { RouteBootstrap } from '@/components/route-bootstrap'

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  return <RouteBootstrap module="customers" />
}
