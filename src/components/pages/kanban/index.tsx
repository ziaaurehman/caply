import KanbanBoard from "@/components/pages/kanban/kanbanPage"

interface KanbanPageWrapperProps {
  params: {
    projectId: string
  }
}

export default function KanbanPageWrapper({ params }: KanbanPageWrapperProps) {
  return <KanbanBoard projectId={params.projectId} />
}
