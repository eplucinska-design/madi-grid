'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import { CustomersList } from '@/components/customers/customers-list'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { MadiGridWorkspace } from '@/components/grid/madi-grid-workspace'
import { InventoryModule } from '@/components/inventory/inventory-module'
import { QuotesModule } from '@/components/quotes/quotes-module'
import { StartView } from '@/components/start/start-view'
import { ActiveWorkload } from '@/components/active-work/active-workload'
import { StudioWorkload } from '@/components/studio/studio-workload'
import { FilesSimpleView } from '@/components/files/files-simple-view'
import { AnnouncementsModule } from '@/components/announcements/announcements-module'
import { ArchiveModule } from '@/components/archive/archive-module'
import { ReportsModule } from '@/components/reports/reports-module'
import { LogisticsModule } from '@/components/logistics/logistics-module'
import { ModuleFrame, StatStrip } from '@/components/common/module-frame'
import {
  AlertTriangle,
  BookOpen,
  MessageSquare,
  Settings,
  Wrench,
} from 'lucide-react'

function PlaceholderModule({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <ModuleFrame
      title={title}
      kicker="Obszar w budowie"
      description={description}
      icon={<Icon size={13} />}
      summary={
        <StatStrip
          items={[
            { label: 'Status', value: 'W budowie', hint: 'gotowe do kolejnego etapu' },
            { label: 'Edycja', value: 'Plan', hint: 'formularze i pola' },
            { label: 'Integracje', value: 'Do decyzji', hint: 'zrodlo danych' },
            { label: 'Widok', value: 'Wspolny', hint: 'layout jak reszta' },
          ]}
        />
      }
      bodyClassName="overflow-auto p-[var(--app-module-gap)]"
    >
      <div className="grid gap-[var(--app-module-gap)] lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-xs text-muted-foreground">Ekran gotowy pod realne pola i akcje.</p>
            </div>
          </div>
          <textarea
            defaultValue={`Notatki wdrozeniowe dla modulu ${title}: pola, uprawnienia, import danych, akcje zbiorcze.`}
            className="h-48 w-full resize-none rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Zakres do dopracowania</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            {['Formularze edycji', 'Lista i filtry', 'Statusy i osoby', 'Import lub integracja'].map((item) => (
              <label key={item} className="flex items-center gap-2 rounded border border-border px-3 py-2">
                <input type="checkbox" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </ModuleFrame>
  )
}

function QuotesModuleView({ panelId }: { panelId?: 'form' | 'quotes' }) {
  useEffect(() => {
    if (!panelId) return
    const id = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('madi:quotes-open-panel', { detail: { panelId } }))
    }, 60)
    return () => window.clearTimeout(id)
  }, [panelId])

  return <QuotesModule />
}

export function ContentRouter() {
  const { currentModule } = useAppStore()

  const renderContent = () => {
    switch (currentModule) {
      case 'start':
        return <StartView />

      case 'grid':
        return (
          <MadiGridWorkspace
            title="Zlecenia operacyjne"
            kicker="Widok wspolny"
            description="Wspolna warstwa pracy dla zlecen, produkcji i DTP"
            preferredView="board"
          />
        )

      case 'dashboard':
        return <DashboardOverview />

      case 'customers':
        return <CustomersList />

      case 'quotes':
        return <QuotesModuleView />

      case 'quotes-list':
        return <QuotesModuleView panelId="quotes" />

      case 'quotes-products':
        return <QuotesModuleView panelId="form" />

      case 'studio':
        return <StudioWorkload key="studio-workload" initialView="overview" />

      case 'studio-design':
        return <StudioWorkload key="studio-design" initialView="board" />

      case 'orders':
        return (
          <MadiGridWorkspace
            title="Zlecenia"
            kicker="Obsluga zlecen"
            description="Tworzenie, edycja, statusy, osoby, terminy, komentarze, checklisty i RCP"
            preferredView="board"
          />
        )

      case 'files':
        return <FilesSimpleView />

      case 'prepress':
        return <StudioWorkload key="prepress-unified" initialView="list" />

      case 'production':
        return (
          <MadiGridWorkspace
            title="Produkcja"
            kicker="Kolejka produkcyjna"
            description="Druk, intro, blokady, kolejnosc i przenoszenie miedzy etapami"
            scope={{ listIds: ['print', 'intro'], statuses: ['todo', 'in_progress', 'review', 'production', 'blocked'] }}
            preferredView="board"
          />
        )

      case 'planning':
        return (
          <MadiGridWorkspace
            title="Planowanie"
            kicker="Terminy i obciazenie"
            description="Widok terminow, priorytetow i planu pracy na najblizsze dni"
            preferredView="calendar"
            lockedView="calendar"
          />
        )

      case 'active-work':
        return <ActiveWorkload />

      case 'logistics':
        return <LogisticsModule />

      case 'invoices':
        return (
          <MadiGridWorkspace
            title="Faktury"
            kicker="Rozliczenia"
            description="Lista spraw rozliczeniowych i subskrypcji powiazanych z praca"
            scope={{ listIds: ['invoices'] }}
            preferredView="list"
          />
        )

      case 'complaints':
        return (
          <PlaceholderModule
            title="Reklamacje"
            description="Reklamacje wymagaja osobnego formularza przyczyn, kosztow i decyzji jakosciowych."
            icon={AlertTriangle}
          />
        )

      case 'inventory':
        return <InventoryModule />

      case 'documents':
        return (
          <PlaceholderModule
            title="Dokumenty"
            description="Procedury, instrukcje i checklisty firmowe zostaja w budowie do kolejnego etapu."
            icon={BookOpen}
          />
        )

      case 'communication':
        return (
          <PlaceholderModule
            title="Komunikacja"
            description="Komunikacja wymaga decyzji, czy laczymy poczte, Slacka, komentarze wewnetrzne czy wszystko naraz."
            icon={MessageSquare}
          />
        )

      case 'marketing':
        return <AnnouncementsModule />

      case 'reports':
        return <ReportsModule />

      case 'archive':
        return <ArchiveModule />

      case 'settings':
        return (
          <PlaceholderModule
            title="Ustawienia"
            description="Konta, role, uprawnienia, integracje i RCP beda osobna warstwa konfiguracji."
            icon={Settings}
          />
        )

      default:
        return (
          <MadiGridWorkspace
            title="Zlecenia"
            kicker="Obsluga zlecen"
            description="Tworzenie, edycja, statusy, osoby, terminy, komentarze i checklisty"
            preferredView="board"
          />
        )
    }
  }

  return <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{renderContent()}</div>
}
