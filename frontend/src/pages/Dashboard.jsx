import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  FolderIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TrendingUpIcon,
  CpuChipIcon,
  MapIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js'
import { useQuery } from 'react-query'
import { dashboardAPI } from '../services/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
)

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('30d')

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    dashboardAPI.getStats,
    {
      select: (response) => response.data.data || {},
      placeholderData: {
        totalProjects: 12,
        activeProjects: 8,
        completedProjects: 4,
        complianceRate: 85,
        pendingValidations: 3,
        aiRecommendations: 15
      }
    }
  )

  const { data: recentActivity } = useQuery(
    'dashboard-activity',
    dashboardAPI.getRecentActivity,
    {
      select: (response) => response.data.data || [],
      placeholderData: [
        {
          id: 1,
          type: 'project_created',
          message: 'New project "Downtown Mixed Use" created',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: 'John Smith'
        },
        {
          id: 2,
          type: 'validation_completed',
          message: 'Validation completed for "Residential Complex A"',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'compliant'
        },
        {
          id: 3,
          type: 'ai_analysis',
          message: 'AI analysis generated 5 recommendations for zoning optimization',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        }
      ]
    }
  )

  // Chart data
  const complianceChartData = {
    labels: ['Compliant', 'Non-Compliant', 'Pending'],
    datasets: [
      {
        data: [stats?.complianceRate || 85, 15, stats?.pendingValidations || 0],
        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  }

  const projectTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Projects Created',
        data: [2, 4, 3, 5, 2, 6],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Projects Completed',
        data: [1, 2, 2, 3, 4, 2],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  }

  const aiInsightsData = {
    labels: ['Height Violations', 'Setback Issues', 'Parking Deficits', 'FAR Violations', 'Other'],
    datasets: [
      {
        label: 'Common Issues',
        data: [8, 12, 6, 4, 3],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ],
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  }

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-6"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-lg bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUpIcon className={`h-4 w-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
                {change}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your projects.</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/projects/new"
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </Link>
          <Link
            to="/ai-assistant"
            className="btn-secondary"
          >
            <CpuChipIcon className="h-4 w-4 mr-2" />
            AI Assistant
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Projects"
          value={stats?.totalProjects || 0}
          change="+12%"
          trend="up"
          icon={FolderIcon}
          color="blue"
        />
        <StatCard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          change="+5%"
          trend="up"
          icon={ClockIcon}
          color="yellow"
        />
        <StatCard
          title="Compliance Rate"
          value={`${stats?.complianceRate || 0}%`}
          change="+3%"
          trend="up"
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="AI Recommendations"
          value={stats?.aiRecommendations || 0}
          change="+8"
          trend="up"
          icon={CpuChipIcon}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Trends */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Project Trends</h3>
            <div className="flex space-x-2">
              {['7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeRange === range
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="card-content">
            <div className="h-64">
              <Line data={projectTrendData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Compliance Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Compliance Overview</h3>
          </div>
          <div className="card-content">
            <div className="h-64">
              <Doughnut data={complianceChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <div className="card">
          <div className="card-header flex items-center">
            <CpuChipIcon className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
          </div>
          <div className="card-content">
            <div className="h-64 mb-4">
              <Bar data={aiInsightsData} options={chartOptions} />
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>AI Recommendation:</strong> Consider reviewing setback requirements 
                for new projects. 12 recent projects had setback violations that could be 
                prevented with early analysis.
              </p>
              <Link
                to="/ai-assistant"
                className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-2 inline-block"
              >
                View detailed analysis →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {recentActivity?.slice(0, 5).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'project_created' ? 'bg-blue-100' :
                      activity.type === 'validation_completed' ? 'bg-green-100' :
                      'bg-purple-100'
                    }`}>
                      {activity.type === 'project_created' && <FolderIcon className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'validation_completed' && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                      {activity.type === 'ai_analysis' && <CpuChipIcon className="h-4 w-4 text-purple-600" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                to="/projects"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View all activity →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/projects/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Create New Project</p>
                <p className="text-sm text-gray-500">Start a new zoning compliance project</p>
              </div>
            </Link>
            <Link
              to="/zoning-map"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MapIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Explore Zoning Map</p>
                <p className="text-sm text-gray-500">View interactive zoning layers</p>
              </div>
            </Link>
            <Link
              to="/ai-assistant"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CpuChipIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">AI Assistant</p>
                <p className="text-sm text-gray-500">Get AI-powered recommendations</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard