import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PaperAirplaneIcon,
  CpuChipIcon,
  LightBulbIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useQuery, useMutation } from 'react-query'
import { aiAPI, projectsAPI } from '../services/api'
import toast from 'react-hot-toast'

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Zoning Compliance Assistant. I can help you with project analysis, compliance predictions, design optimization, and answer any zoning-related questions. How can I assist you today?",
      timestamp: new Date(),
      features: ['analysis', 'prediction', 'optimization', 'qa']
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')
  const messagesEndRef = useRef(null)

  // Fetch projects for AI analysis
  const { data: projects } = useQuery(
    'projects-for-ai',
    projectsAPI.getAll,
    {
      select: (response) => response.data.data?.projects || [],
      placeholderData: [
        {
          id: 1,
          name: 'Downtown Mixed Use Development',
          status: 'under_review',
          compliance_score: 78
        },
        {
          id: 2,
          name: 'Residential Complex A',
          status: 'approved',
          compliance_score: 95
        },
        {
          id: 3,
          name: 'Commercial Plaza',
          status: 'requires_revision',
          compliance_score: 62
        }
      ]
    }
  )

  // AI Chat Mutation
  const chatMutation = useMutation(
    ({ message, context }) => aiAPI.chatWithAssistant(message, context),
    {
      onSuccess: (response) => {
        const aiResponse = response.data.data
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: aiResponse.message,
          timestamp: new Date(),
          suggestions: aiResponse.suggestions,
          analysis: aiResponse.analysis
        }])
        setIsTyping(false)
      },
      onError: () => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: "I apologize, but I'm having trouble processing your request right now. Please try again later or contact support if the issue persists.",
          timestamp: new Date(),
          error: true
        }])
        setIsTyping(false)
      }
    }
  )

  // Project Analysis Mutation
  const analysisMutation = useMutation(
    (projectId) => aiAPI.analyzeProject(projectId),
    {
      onSuccess: (response) => {
        const analysis = response.data.data
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: `I've completed the analysis for "${selectedProject?.name}". Here are my findings:`,
          timestamp: new Date(),
          analysis: analysis,
          actionable: true
        }])
        toast.success('Project analysis completed!')
      },
      onError: () => {
        toast.error('Failed to analyze project')
      }
    }
  )

  // Compliance Prediction Mutation
  const predictionMutation = useMutation(
    (projectData) => aiAPI.predictCompliance(projectData),
    {
      onSuccess: (response) => {
        const prediction = response.data.data
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: `Based on my analysis, here's the compliance prediction for your project:`,
          timestamp: new Date(),
          prediction: prediction,
          actionable: true
        }])
      }
    }
  )

  // Design Optimization Mutation
  const optimizationMutation = useMutation(
    ({ projectId, preferences }) => aiAPI.optimizeDesign(projectId, preferences),
    {
      onSuccess: (response) => {
        const optimization = response.data.data
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: `I've generated optimization recommendations for your project:`,
          timestamp: new Date(),
          optimization: optimization,
          actionable: true
        }])
        toast.success('Design optimization completed!')
      }
    }
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Simulate AI processing with context
    const context = {
      selectedProject: selectedProject?.id,
      recentMessages: messages.slice(-5),
      userProjects: projects?.length || 0
    }

    chatMutation.mutate({ message: inputMessage, context })
  }

  const handleQuickAction = (action, projectId = null) => {
    const project = projects?.find(p => p.id === projectId) || selectedProject

    switch (action) {
      case 'analyze':
        if (project) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'user',
            content: `Please analyze project: ${project.name}`,
            timestamp: new Date()
          }])
          analysisMutation.mutate(project.id)
        }
        break
      case 'predict':
        if (project) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'user',
            content: `Predict compliance for: ${project.name}`,
            timestamp: new Date()
          }])
          predictionMutation.mutate({
            projectId: project.id,
            projectData: project
          })
        }
        break
      case 'optimize':
        if (project) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'user',
            content: `Optimize design for: ${project.name}`,
            timestamp: new Date()
          }])
          optimizationMutation.mutate({
            projectId: project.id,
            preferences: { prioritize: 'compliance', budget: 'medium' }
          })
        }
        break
    }
  }

  const AIMessage = ({ message }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start space-x-3"
    >
      <div className="flex-shrink-0">
        <div className="p-2 bg-purple-100 rounded-full">
          <CpuChipIcon className="h-5 w-5 text-purple-600" />
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-900">{message.content}</p>
          
          {/* Analysis Results */}
          {message.analysis && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Analysis Results
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Compliance Score</p>
                  <p className="text-lg font-bold text-green-900">{message.analysis.compliance_score}%</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Issues Found</p>
                  <p className="text-lg font-bold text-yellow-900">{message.analysis.issues_count || 3}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Recommendations</p>
                  <p className="text-lg font-bold text-blue-900">{message.analysis.recommendations_count || 5}</p>
                </div>
              </div>
              {message.analysis.recommendations && (
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Key Recommendations:</h5>
                  <ul className="space-y-1">
                    {message.analysis.recommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-700">
                        <LightBulbIcon className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Compliance Prediction */}
          {message.prediction && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <SparklesIcon className="h-4 w-4 mr-2" />
                Compliance Prediction
              </h4>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Predicted Compliance</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    message.prediction.score >= 80 ? 'bg-green-100 text-green-800' :
                    message.prediction.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {message.prediction.score}% Likely
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      message.prediction.score >= 80 ? 'bg-green-500' :
                      message.prediction.score >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${message.prediction.score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {message.prediction.reasoning || 'Based on similar projects and current zoning requirements.'}
                </p>
              </div>
            </div>
          )}

          {/* Design Optimization */}
          {message.optimization && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <LightBulbIcon className="h-4 w-4 mr-2" />
                Design Optimization
              </h4>
              <div className="space-y-3">
                {message.optimization.suggestions?.map((suggestion, index) => (
                  <div key={index} className="bg-blue-50 p-3 rounded-lg">
                    <h5 className="font-medium text-blue-900">{suggestion.title}</h5>
                    <p className="text-sm text-blue-700 mt-1">{suggestion.description}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Impact: {suggestion.impact || 'High'}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Effort: {suggestion.effort || 'Medium'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {message.suggestions && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(suggestion)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  )

  const UserMessage = ({ message }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start space-x-3 flex-row-reverse"
    >
      <div className="flex-shrink-0">
        <div className="p-2 bg-primary-100 rounded-full">
          <span className="text-sm font-medium text-primary-700">You</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        <div className="bg-primary-600 text-white p-4 rounded-lg max-w-md ml-auto">
          <p>{message.content}</p>
        </div>
        <p className="text-xs text-gray-500 text-right">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CpuChipIcon className="h-7 w-7 text-purple-600 mr-3" />
            AI Assistant
          </h1>
          <p className="text-gray-600">Get intelligent insights and automated analysis for your zoning projects</p>
        </div>
        
        {/* Project Selector */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = projects?.find(p => p.id === parseInt(e.target.value))
              setSelectedProject(project)
            }}
            className="input max-w-xs"
          >
            <option value="">Select a project...</option>
            {projects?.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { id: 'chat', name: 'Chat', icon: CpuChipIcon },
          { id: 'analysis', name: 'Auto Analysis', icon: ChartBarIcon },
          { id: 'insights', name: 'Insights', icon: LightBulbIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-6 p-4 bg-gray-50 rounded-lg">
            <AnimatePresence>
              {messages.map((message) => (
                <div key={message.id}>
                  {message.type === 'ai' ? (
                    <AIMessage message={message} />
                  ) : (
                    <UserMessage message={message} />
                  )}
                </div>
              ))}
            </AnimatePresence>
            
            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-3"
              >
                <div className="p-2 bg-purple-100 rounded-full">
                  <CpuChipIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="mt-4 mb-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => handleQuickAction('analyze')}
                disabled={!selectedProject}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Analyze Project
              </button>
              <button
                onClick={() => handleQuickAction('predict')}
                disabled={!selectedProject}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Predict Compliance
              </button>
              <button
                onClick={() => handleQuickAction('optimize')}
                disabled={!selectedProject}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                <LightBulbIcon className="h-4 w-4 mr-2" />
                Optimize Design
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about zoning compliance..."
              className="flex-1 input"
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="btn-primary disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium">Automated Analysis</h3>
              </div>
              <div className="card-content space-y-4">
                <p className="text-gray-600">
                  Run comprehensive AI analysis on your projects to identify potential compliance issues and optimization opportunities.
                </p>
                {projects?.map(project => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-gray-500">Status: {project.status}</p>
                    </div>
                    <button
                      onClick={() => handleQuickAction('analyze', project.id)}
                      className="btn-primary text-sm"
                    >
                      Analyze
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium">Compliance Predictions</h3>
              </div>
              <div className="card-content space-y-4">
                <p className="text-gray-600">
                  Get AI-powered predictions for project compliance based on historical data and zoning requirements.
                </p>
                {projects?.map(project => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <div className="flex items-center mt-1">
                        <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${project.compliance_score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{project.compliance_score}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickAction('predict', project.id)}
                      className="btn-secondary text-sm"
                    >
                      Predict
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  Common Issues
                </h3>
              </div>
              <div className="card-content space-y-3">
                {[
                  'Setback violations in 45% of projects',
                  'Height restrictions exceeded in 23% of cases',
                  'Parking requirements unmet in 18% of projects'
                ].map((insight, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  Success Patterns
                </h3>
              </div>
              <div className="card-content space-y-3">
                {[
                  'Projects with early AI analysis have 85% compliance rate',
                  'Optimized designs reduce approval time by 30%',
                  'Regular validation checks prevent 90% of issues'
                ].map((insight, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium flex items-center">
                  <LightBulbIcon className="h-5 w-5 text-blue-500 mr-2" />
                  Recommendations
                </h3>
              </div>
              <div className="card-content space-y-3">
                {[
                  'Run AI analysis before finalizing designs',
                  'Use predictive compliance for early validation',
                  'Implement suggested optimizations promptly'
                ].map((insight, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIAssistant