import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useQuery } from 'react-query'
import { projectsAPI } from '../services/api'

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')

  // Fetch projects
  const { data: projects, isLoading } = useQuery(
    ['projects', { search: searchTerm, status: statusFilter, sort: sortBy }],
    () => projectsAPI.getAll({ search: searchTerm, status: statusFilter, sort: sortBy }),
    {
      select: (response) => response.data.data?.projects || [],
      placeholderData: [
        {
          id: 1,
          name: 'Downtown Mixed Use Development',
          description: 'A comprehensive mixed-use development in the downtown core',
          status: 'under_review',
          address: '123 Main Street, Downtown',
          lot_size: 15000,
          proposed_building_height: 45,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T14:30:00Z',
          owner_name: 'John Smith',
          compliance_score: 78
        },
        {
          id: 2,
          name: 'Residential Complex A',
          description: 'Multi-family residential complex with 120 units',
          status: 'approved',
          address: '456 Oak Avenue, Westside',
          lot_size: 25000,
          proposed_building_height: 35,
          created_at: '2024-01-10T09:00:00Z',
          updated_at: '2024-01-18T16:45:00Z',
          owner_name: 'Jane Doe',
          compliance_score: 95
        },
        {
          id: 3,
          name: 'Commercial Plaza',
          description: 'Retail and office space development',
          status: 'requires_revision',
          address: '789 Commerce Blvd, Business District',
          lot_size: 18000,
          proposed_building_height: 28,
          created_at: '2024-01-05T11:30:00Z',
          updated_at: '2024-01-22T09:15:00Z',
          owner_name: 'Mike Johnson',
          compliance_score: 62
        },
        {
          id: 4,
          name: 'Green Office Building',
          description: 'Sustainable office building with LEED certification',
          status: 'draft',
          address: '321 Eco Street, Green District',
          lot_size: 12000,
          proposed_building_height: 40,
          created_at: '2024-01-25T08:00:00Z',
          updated_at: '2024-01-25T08:00:00Z',
          owner_name: 'Sarah Wilson',
          compliance_score: null
        }
      ]
    }
  )

  // Filter projects based on search and status
  const filteredProjects = projects?.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'under_review':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'requires_revision':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <FolderIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'under_review':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'requires_revision':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getComplianceColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">
            Manage your zoning compliance projects and track their progress
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Project
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="requires_revision">Requires Revision</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
            >
              <option value="updated_at">Last Updated</option>
              <option value="created_at">Date Created</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects?.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="card-content">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  {getStatusIcon(project.status)}
                  <h3 className="ml-2 text-lg font-semibold text-gray-900 line-clamp-1">
                    {project.name}
                  </h3>
                </div>
                <span className={getStatusBadge(project.status)}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {project.description}
              </p>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Address:</span>
                  <span className="text-gray-900 text-right line-clamp-1">
                    {project.address}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lot Size:</span>
                  <span className="text-gray-900">
                    {project.lot_size?.toLocaleString()} sq ft
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Height:</span>
                  <span className="text-gray-900">
                    {project.proposed_building_height} ft
                  </span>
                </div>
                {project.compliance_score !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Compliance:</span>
                    <span className={`font-medium ${getComplianceColor(project.compliance_score)}`}>
                      {project.compliance_score}%
                    </span>
                  </div>
                )}
              </div>

              {/* Owner and Date */}
              <div className="text-xs text-gray-500 mb-4">
                <p>Owner: {project.owner_name}</p>
                <p>Updated: {new Date(project.updated_at).toLocaleDateString()}</p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Link
                  to={`/projects/${project.id}`}
                  className="flex-1 btn-primary text-center text-sm"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </Link>
                <button className="btn-secondary text-sm">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button className="btn-danger text-sm">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects?.length === 0 && (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating a new project'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <div className="mt-6">
              <Link to="/projects/new" className="btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Project Stats */}
      {filteredProjects?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Project Summary</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {filteredProjects.length}
                </p>
                <p className="text-sm text-gray-500">Total Projects</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {filteredProjects.filter(p => p.status === 'approved').length}
                </p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredProjects.filter(p => p.status === 'under_review').length}
                </p>
                <p className="text-sm text-gray-500">Under Review</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    filteredProjects
                      .filter(p => p.compliance_score !== null)
                      .reduce((acc, p) => acc + p.compliance_score, 0) /
                    filteredProjects.filter(p => p.compliance_score !== null).length || 0
                  )}%
                </p>
                <p className="text-sm text-gray-500">Avg Compliance</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects