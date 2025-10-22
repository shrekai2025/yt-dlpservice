"use client"

import { useMemo } from 'react'
import { api } from '~/components/providers/trpc-provider'

interface UseMediaQueriesOptions {
  viewTab: 'folders' | 'actors'
  selectedFolder: string | null
  selectedActor: string | null
  showUnassigned: boolean
  filterSource?: string | null
  filterStarred?: boolean
  leftSidebarCollapsed: boolean
}

export function useMediaQueries({
  viewTab,
  selectedFolder,
  selectedActor,
  showUnassigned,
  filterSource,
  filterStarred,
  leftSidebarCollapsed,
}: UseMediaQueriesOptions) {
  // ===== Infinite Scroll Query for Files =====
  const {
    data: infiniteFilesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch: refetchFiles,
  } = api.mediaBrowser.listFiles.useInfiniteQuery(
    {
      pageSize: 30,
      folderId: viewTab === 'folders' ? (showUnassigned ? null : selectedFolder) : undefined,
      actorId: viewTab === 'actors' ? selectedActor : undefined,
      type: undefined, // 不在API层过滤,在前端过滤
      source: filterSource,
      starred: filterStarred ? true : undefined,
    },
    {
      getNextPageParam: (lastPage) => {
        const { page, totalPages } = lastPage.pagination
        if (page >= totalPages) return undefined
        return page + 1
      },
      initialPageParam: 1,
    }
  )

  // Flatten pages into single array for compatibility
  const filesData = useMemo(() => {
    if (!infiniteFilesData) return undefined

    const allFiles = infiniteFilesData.pages.flatMap((page) => page.files)
    const lastPage = infiniteFilesData.pages[infiniteFilesData.pages.length - 1]

    return {
      files: allFiles,
      pagination: lastPage?.pagination,
      total: lastPage?.pagination.total ?? 0,
    }
  }, [infiniteFilesData])

  // ===== Query: All Files Count =====
  const { data: allFilesData } = api.mediaBrowser.listFiles.useQuery(
    {
      page: 1,
      pageSize: 1,
    },
    {
      enabled: !leftSidebarCollapsed,
      staleTime: 30000,
      gcTime: 60000,
    }
  )

  // ===== Query: Unassigned Files Count =====
  const { data: unassignedFilesData } = api.mediaBrowser.listFiles.useQuery(
    {
      page: 1,
      pageSize: 1,
      folderId: null,
    },
    {
      enabled: viewTab === 'folders' && !leftSidebarCollapsed,
      staleTime: 30000,
      gcTime: 60000,
    }
  )

  // ===== Query: Folders =====
  const { data: folders, refetch: refetchFolders } = api.mediaBrowser.listFolders.useQuery(
    undefined,
    {
      enabled: viewTab === 'folders' && !leftSidebarCollapsed,
      staleTime: 30000,
      gcTime: 60000,
    }
  )

  // ===== Query: Actors =====
  const { data: actors, refetch: refetchActors } = api.mediaBrowser.listActors.useQuery(
    undefined,
    {
      enabled: viewTab === 'actors' && !leftSidebarCollapsed,
      staleTime: 30000,
      gcTime: 60000,
    }
  )

  return {
    // Files data
    filesData,
    infiniteFilesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetchFiles,
    
    // Counts
    allFilesData,
    unassignedFilesData,
    
    // Folders
    folders,
    refetchFolders,
    
    // Actors
    actors,
    refetchActors,
  }
}

