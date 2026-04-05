import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActivityEntries, postComment } from '../lib/server/activity-feed'

export function useActivityFeed({
  entityType,
  entityId,
}: {
  entityType: string
  entityId: string
}) {
  const queryClient = useQueryClient()
  const queryKey = ['activity', entityType, entityId]

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getActivityEntries({ data: { entityType, entityId } }),
    staleTime: 30_000,
  })

  const { mutate: postCommentMutate, isPending: isPosting } = useMutation({
    mutationFn: (input: { body: string; isInternal: boolean }) =>
      postComment({
        data: { entityType, entityId, body: input.body, isInternal: input.isInternal },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    entries,
    isLoading,
    postComment: postCommentMutate,
    isPosting,
  }
}
