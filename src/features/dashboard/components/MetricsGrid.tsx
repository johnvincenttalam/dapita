import { ErrorState } from '@/components/feedback/ErrorState'
import { useMetricsQuery } from '@/features/dashboard/api/queries'
import { MetricCard, MetricCardSkeleton } from '@/features/dashboard/components/MetricCard'

export function MetricsGrid() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMetricsQuery()

  if (isError) {
    return (
      <ErrorState title="Metrics unavailable" error={error} onRetry={() => void refetch()} isRetrying={isRefetching} />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={isPending}>
      {isPending ? (
        <>
          <span className="sr-only" role="status">
            Loading metrics
          </span>
          {Array.from({ length: 4 }, (_, index) => (
            <MetricCardSkeleton key={index} />
          ))}
        </>
      ) : (
        data.map((metric) => <MetricCard key={metric.id} metric={metric} />)
      )}
    </div>
  )
}
