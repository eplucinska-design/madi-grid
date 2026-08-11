import { RouteBootstrap } from '@/components/route-bootstrap'

export function generateStaticParams() {
  return [
    'studio-koperty-c4-personalizacja',
    'dtp-8fef75e1-4d58-4b9d-b262-c8286b5cd457',
    'dtp-577edafa-21b1-41ae-bfaa-11d37f46291b',
    'dtp-eec1f458-e79c-4d6e-8f56-e6e4daa8619a',
    'dtp-e689c703-b366-459b-a3b5-a6af8e7fade2',
  ].map((id) => ({ id }))
}

export default async function StudioTaskPage({ params }: { params: Promise<{ id: string }> }) {
  await params
  return <RouteBootstrap module="active-work" />
}
