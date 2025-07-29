import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  FolderIcon,
  MapIcon,
  CheckCircleIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'New Project', href: '/projects/new', icon: PlusCircleIcon },
  { name: 'Zoning Map', href: '/zoning-map', icon: MapIcon },
  { name: 'Validation', href: '/validation', icon: CheckCircleIcon },
  { name: 'AI Assistant', href: '/ai-assistant', icon: CpuChipIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

const Sidebar = ({ onClose }) => {
  const { user, getUserInitials } = useAuthStore()

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Zoning System</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white lg:hidden"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              isActive
                ? 'sidebar-item-active'
                : 'sidebar-item-inactive'
            }
            onClick={onClose}
          >
            <item.icon
              className="mr-3 h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* User profile section */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {getUserInitials()}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar