import RequireAuth from '@/components/RequireAuth';
import MatchHost from '@/components/match/MatchHost';

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <MatchHost matchId={id} />
    </RequireAuth>
  );
}
