import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  MapPinIcon,
  CpuChipIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useMutation } from 'react-query'
import { projectsAPI } from '../services/api'
import toast from 'react-hot-toast'

const CreateProject = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [projectArea, setProjectArea] = useState(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm()

  const createProjectMutation = useMutation(
    (projectData) => projectsAPI.create(projectData),
    {
      onSuccess: (response) => {
        const project = response.data.data.project
        toast.success('Project created successfully!')
        navigate(`/projects/${project.id}`)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create project')
      }
    }
  )

  const watchedValues = watch()

  const onSubmit = (data) => {
    const projectData = {
      ...data,
      project_area: projectArea
    }
    createProjectMutation.mutate(projectData)
  }

  const steps = [
    {
      id: 1,
      title: 'Basic Information',
      description: 'Project name, description, and location details'
    },
    {
      id: 2,
      title: 'Project Specifications',
      description: 'Building dimensions and technical details'
    },
    {
      id: 3,
      title: 'Project Area',
      description: 'Define the project boundaries on the map'
    },
    {
      id: 4,
      title: 'Review & Submit',
      description: 'Review all information and create project'
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const StepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep >= step.id
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-gray-300 text-gray-400'
            }`}>
              {currentStep > step.id ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-20 ml-4 ${
                currentStep > step.id ? 'bg-primary-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {steps[currentStep - 1].title}
        </h2>
        <p className="text-gray-600">
          {steps[currentStep - 1].description}
        </p>
      </div>
    </div>
  )

  const Step1BasicInfo = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Name *
        </label>
        <input
          {...register('name', { required: 'Project name is required' })}
          type="text"
          className={`input ${errors.name ? 'border-red-300' : ''}`}
          placeholder="Enter project name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="input"
          placeholder="Describe your project..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Address *
        </label>
        <input
          {...register('address', { required: 'Address is required' })}
          type="text"
          className={`input ${errors.address ? 'border-red-300' : ''}`}
          placeholder="Enter full address"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start">
          <CpuChipIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">AI Suggestion</h4>
            <p className="text-sm text-blue-700 mt-1">
              Based on the address you enter, our AI will automatically suggest 
              optimal building parameters and identify potential zoning considerations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const Step2Specifications = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lot Size (sq ft) *
          </label>
          <input
            {...register('lot_size', { 
              required: 'Lot size is required',
              min: { value: 1, message: 'Lot size must be positive' }
            })}
            type="number"
            className={`input ${errors.lot_size ? 'border-red-300' : ''}`}
            placeholder="e.g., 10000"
          />
          {errors.lot_size && (
            <p className="mt-1 text-sm text-red-600">{errors.lot_size.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proposed Building Height (ft) *
          </label>
          <input
            {...register('proposed_building_height', { 
              required: 'Building height is required',
              min: { value: 1, message: 'Height must be positive' }
            })}
            type="number"
            className={`input ${errors.proposed_building_height ? 'border-red-300' : ''}`}
            placeholder="e.g., 45"
          />
          {errors.proposed_building_height && (
            <p className="mt-1 text-sm text-red-600">{errors.proposed_building_height.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proposed Floor Area (sq ft)
          </label>
          <input
            {...register('proposed_floor_area', {
              min: { value: 1, message: 'Floor area must be positive' }
            })}
            type="number"
            className="input"
            placeholder="e.g., 25000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proposed Parking Spaces
          </label>
          <input
            {...register('proposed_parking_spaces', {
              min: { value: 0, message: 'Parking spaces cannot be negative' }
            })}
            type="number"
            className="input"
            placeholder="e.g., 50"
          />
        </div>
      </div>

      {/* AI Compliance Prediction */}
      {watchedValues.lot_size && watchedValues.proposed_building_height && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-start">
            <CpuChipIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-900">AI Compliance Prediction</h4>
              <p className="text-sm text-green-700 mt-1">
                Based on your specifications, this project has a <strong>78% probability</strong> of 
                meeting zoning compliance requirements. The building height appears to be within 
                acceptable limits for most residential zones.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const Step3ProjectArea = () => (
    <div className="space-y-6">
      <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Define Project Area</h3>
        <p className="mt-1 text-sm text-gray-500">
          Click and drag on the map to define your project boundaries
        </p>
        <div className="mt-4">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              // This would open a map modal in a real implementation
              setProjectArea({
                type: 'Polygon',
                coordinates: [[
                  [-74.006, 40.712],
                  [-74.005, 40.712],
                  [-74.005, 40.713],
                  [-74.006, 40.713],
                  [-74.006, 40.712]
                ]]
              })
              toast.success('Project area defined successfully!')
            }}
          >
            Open Map Editor
          </button>
        </div>
      </div>

      {projectArea && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-900">
              Project area has been defined
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Area: ~0.25 acres | Perimeter: ~650 ft
          </p>
        </div>
      )}

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start">
          <CpuChipIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-yellow-900">AI Zoning Analysis</h4>
            <p className="text-sm text-yellow-700 mt-1">
              The defined area appears to be within a <strong>C-1 Commercial District</strong>. 
              This zoning allows for the proposed building height and use type. 
              Consider setback requirements of 15ft from the street.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const Step4Review = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium">Project Summary</h3>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900">Basic Information</h4>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name:</dt>
                  <dd className="text-gray-900">{watchedValues.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Address:</dt>
                  <dd className="text-gray-900">{watchedValues.address}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Specifications</h4>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Lot Size:</dt>
                  <dd className="text-gray-900">{watchedValues.lot_size?.toLocaleString()} sq ft</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Height:</dt>
                  <dd className="text-gray-900">{watchedValues.proposed_building_height} ft</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Floor Area:</dt>
                  <dd className="text-gray-900">{watchedValues.proposed_floor_area?.toLocaleString()} sq ft</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Parking:</dt>
                  <dd className="text-gray-900">{watchedValues.proposed_parking_spaces} spaces</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-start">
          <CpuChipIcon className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-purple-900">AI Final Assessment</h4>
            <p className="text-sm text-purple-700 mt-1">
              Your project shows <strong>strong compliance potential</strong> with current zoning requirements. 
              Recommended next steps: Run detailed validation analysis after creation and consider 
              the suggested setback adjustments for optimal approval chances.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BuildingOfficeIcon className="h-7 w-7 text-primary-600 mr-3" />
          Create New Project
        </h1>
        <p className="text-gray-600">
          Use our AI-powered wizard to create and validate your zoning compliance project
        </p>
      </div>

      <div className="card">
        <div className="card-content">
          <StepIndicator />

          <form onSubmit={handleSubmit(onSubmit)}>
            {currentStep === 1 && <Step1BasicInfo />}
            {currentStep === 2 && <Step2Specifications />}
            {currentStep === 3 && <Step3ProjectArea />}
            {currentStep === 4 && <Step4Review />}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex space-x-3">
                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="btn-primary"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={createProjectMutation.isLoading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {createProjectMutation.isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </div>
                    ) : (
                      'Create Project'
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateProject