/**
 * Projects settings section.
 * List of projects: name, order count (Geist Mono), date created (Geist Mono).
 * Create/Edit: inline form (name required, description optional).
 * Archive: soft delete with confirmation.
 */
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  TextField,
  Input,
  Label,
  TextArea,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Archive, FolderOpen } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveProject, archiveProject } from '../../lib/server/settings'
import type { Project } from '../../types/settings'

interface ProjectsSectionProps {
  projects: Project[]
}

interface ProjectFormValues {
  name: string
  description: string
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: (data: ProjectFormValues & { id?: string }) =>
      saveProject({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowForm(false)
      setEditingProject(null)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (projectId: string) =>
      archiveProject({ data: { projectId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setArchivingId(null)
    },
  })

  function handleEdit(project: Project) {
    setEditingProject(project)
    setShowForm(true)
  }

  function handleAdd() {
    setEditingProject(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          {t('settings.projects.title')}
        </h2>
        <Button
          onPress={handleAdd}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <Plus size={16} />
          {t('settings.projects.create')}
        </Button>
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-start justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]"
          >
            <div className="flex items-start gap-3">
              <FolderOpen
                size={18}
                className="mt-0.5 text-[var(--color-text-muted)]"
              />
              <div>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {project.name}
                </span>
                {project.description && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t('settings.projects.orders')}:{' '}
                    <span className="font-mono">
                      {project.orderCount}
                    </span>
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t('settings.projects.created')}:{' '}
                    <span className="font-mono">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onPress={() => handleEdit(project)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label={t('settings.projects.edit')}
              >
                <Pencil size={14} />
              </Button>
              <Button
                onPress={() => setArchivingId(project.id)}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
                aria-label={t('settings.projects.archive')}
              >
                <Archive size={14} />
              </Button>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="text-center py-8">
            <FolderOpen
              size={32}
              className="mx-auto text-[var(--color-text-subtle)] mb-2"
            />
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('settings.projects.empty')}
            </p>
          </div>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <ProjectFormInline
          project={editingProject}
          onSave={(data) =>
            saveMutation.mutate({
              ...data,
              id: editingProject?.id,
            })
          }
          onCancel={() => {
            setShowForm(false)
            setEditingProject(null)
          }}
          isPending={saveMutation.isPending}
        />
      )}

      {/* Archive confirmation */}
      {archivingId && (
        <ArchiveConfirmDialog
          onConfirm={() => archiveMutation.mutate(archivingId)}
          onClose={() => setArchivingId(null)}
          isPending={archiveMutation.isPending}
        />
      )}
    </div>
  )
}

// ============================================================================
// Inline Project Form
// ============================================================================

function ProjectFormInline({
  project,
  onSave,
  onCancel,
  isPending,
}: {
  project: Project | null
  onSave: (data: ProjectFormValues) => void
  onCancel: () => void
  isPending: boolean
}) {
  const { t } = useTranslation('portal')

  const { control, handleSubmit } = useForm<ProjectFormValues>({
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
    },
  })

  const onSubmit = handleSubmit((data) => onSave(data))

  return (
    <form
      onSubmit={onSubmit}
      className="p-4 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)] space-y-3"
    >
      <Controller
        name="name"
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <TextField
            value={field.value}
            onChange={field.onChange}
            isRequired
            autoFocus
            className="space-y-1"
          >
            <Label className="text-sm text-[var(--color-text-muted)]">
              {t('settings.projects.name')}
            </Label>
            <Input className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
          </TextField>
        )}
      />

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextField
            value={field.value}
            onChange={field.onChange}
            className="space-y-1"
          >
            <Label className="text-sm text-[var(--color-text-muted)]">
              {t('settings.projects.description')}
            </Label>
            <TextArea className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none h-20" />
          </TextField>
        )}
      />

      <div className="flex justify-end gap-3">
        <Button
          onPress={onCancel}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          {t('settings.cancel')}
        </Button>
        <Button
          type="submit"
          isDisabled={isPending}
          className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? t('settings.saving') : t('settings.saveChanges')}
        </Button>
      </div>
    </form>
  )
}

// ============================================================================
// Archive Confirm Dialog
// ============================================================================

function ArchiveConfirmDialog({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  const { t } = useTranslation('portal')

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-sm mx-4 rounded-2xl bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl">
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-lg font-semibold text-[var(--color-text)] mb-2">
            {t('settings.projects.archiveConfirm')}
          </Heading>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {t('settings.projects.archiveBody')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              onPress={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {t('settings.cancel')}
            </Button>
            <Button
              onPress={onConfirm}
              isDisabled={isPending}
              className="px-4 py-2 rounded-lg bg-[var(--color-error)] text-white text-sm font-medium cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {t('settings.projects.archiveAction')}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
