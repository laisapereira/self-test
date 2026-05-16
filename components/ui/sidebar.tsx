import Link from "next/link";
import { JSX } from "react";
import { X } from "lucide-react";

type SidebarItem = {
  href: string;
  title: string;
};

const Sidebar = ({
  isOpen,
  toggle,
  items,
}: {
  isOpen: boolean;
  toggle: () => void;
  items: SidebarItem[];
}): JSX.Element => {
  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-black/30" onClick={toggle} />
      <aside
        className={`absolute right-0 top-0 h-full w-72 max-w-full bg-white shadow-2xl p-6 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          className="absolute right-4 top-4 rounded-full p-2 text-gray-600 hover:bg-gray-100"
          onClick={toggle}
          aria-label="Fechar menu"
        >
          <X className="h-6 w-6" />
        </button>
        <nav className="mt-10">
          <ul className="space-y-3 text-lg font-medium text-gray-700">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={toggle}
                  className="block rounded-lg px-3 py-2 hover:bg-gray-100"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
};

export default Sidebar;
