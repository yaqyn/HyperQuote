/**
 * Projects settings section.
 * "Data is the design" — rows with bottom borders, monospace numbers/dates.
 * Create button dark bg. Edit/archive as text links.
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

const labelClass =
  'text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

const underlineInputClass =
  'w-full bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] placeholder:text-[var(--color-text-subtle)]'

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
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <Button
          onPress={handleAdd}
          className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
        >
          {t('settings.projects.create')}
        </Button>
      </div>

      {/* Project rows */}
      <div>
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-start justify-between py-4 border-b border-[var(--color-border)]"
          >
            <div className="space-y-0.5">
              <span className="text-sm text-[var(--color-text)]">
                {project.name}
              </span>
              {project.description && (
                <p className="text-sm text-[var(--color-text-subtle)]">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-1">
                <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
                  {t('settings.projects.orders')}{' '}
                  <span className="font-mono">
                    {project.orderCount}
                  </span>
                </span>
                <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
                  {t('settings.projects.created')}{' '}
                  <span className="font-mono">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onPress={() => handleEdit(project)}
                className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
              >
                {t('settings.projects.edit')}
              </Button>
              <Button
                onPress={() => setArchivingId(project.id)}
                className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
              >
                {t('settings.projects.archive')}
              </Button>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <p className="py-8 text-sm text-[var(--color-text-subtle)] text-center">
            {t('settings.projects.empty')}
          </p>
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
      className="space-y-5 pt-4 border-t border-[var(--color-border)]"
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
            className="space-y-1.5"
          >
            <Label className={labelClass}>
              {t('settings.projects.name')}
            </Label>
            <Input className={underlineInputClass} />
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
            className="space-y-1.5"
          >
            <Label className={labelClass}>
              {t('settings.projects.description')}
            </Label>
            <TextArea className="w-full bg-transparent border-0 border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB] resize-none h-20" />
          </TextField>
        )}
      />

      <div className="flex justify-end gap-4">
        <Button
          onPress={onCancel}
          className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
        >
          {t('settings.cancel')}
        </Button>
        <Button
          type="submit"
          isDisabled={isPending}
          className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
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
      <Modal className="w-full max-w-sm mx-4 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-[var(--color-border)] shadow-xl">
        <Dialog className="p-6 outline-none">
          <Heading slot="title" className="text-sm font-medium text-[var(--color-text)] mb-2">
            {t('settings.projects.archiveConfirm')}
          </Heading>
          <p className="text-sm text-[var(--color-text-subtle)] mb-6">
            {t('settings.projects.archiveBody')}
          </p>
          <div className="flex justify-end gap-4">
            <Button
              onPress={onClose}
              className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              {t('settings.cancel')}
            </Button>
            <Button
              onPress={onConfirm}
              isDisabled={isPending}
              className="px-4 py-2 bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-sm cursor-pointer outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {t('settings.projects.archiveAction')}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
