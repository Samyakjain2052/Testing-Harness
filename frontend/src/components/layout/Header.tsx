import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="flex h-14 items-center justify-end border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{user?.name || user?.email}</span>
        </div>
        <button
          onClick={logout}
          className="btn-ghost btn-sm"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
