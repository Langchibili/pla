'use client';
import EmptyState from '@/components/EmptyState';
import { useRouter } from 'next/navigation';
export default function NotFound() { const r = useRouter(); return <EmptyState icon="🧭" title="Page not found" body="This screen doesn't exist." action="Go home" onAction={() => r.push('/')} />; }
