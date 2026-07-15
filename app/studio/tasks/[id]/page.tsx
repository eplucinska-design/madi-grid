import { RouteBootstrap } from '@/components/route-bootstrap'

export default async function StudioTaskPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  return <RouteBootstrap module="active-work" />
}
