import { Link } from "react-router-dom";
import { Home, Scissors, Users, Calendar } from "lucide-react";

export function AppSidebar() {
  return (
    <aside className="h-screen w-64 border-r bg-background px-4 py-6 hidden md:block">
      <nav className="space-y-2">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          to="/services"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <Scissors className="h-4 w-4" />
          Services
        </Link>
        <Link
          to="/staff"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <Users className="h-4 w-4" />
          Staff
        </Link>
        <Link
          to="/book"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <Calendar className="h-4 w-4" />
          Book
        </Link>
      </nav>
    </aside>
  );
}
