import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import OrderDetailClient from './OrderDetailClient';

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">Forbidden</h1>
        <p>You do not have access to this area.</p>
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      <OrderDetailClient orderId={params.id} />
    </div>
  );
}
