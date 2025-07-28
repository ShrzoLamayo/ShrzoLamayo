import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';

const ProjectForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  
  const { control, handleSubmit, formState: { errors }, watch } = useForm();

  const projectTypes = [
    'Residential',
    'Commercial', 
    'Industrial',
    'Mixed Use',
    'Institutional',
    'Special Building'
  ];

  const steps = ['Basic Information', 'Location Details', 'Document References'];

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/projects', data);
      
      if (response.data) {
        // Navigate to project details with the new project ID
        navigate(`/project/${response.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="project_title"
                control={control}
                rules={{ required: 'Project title is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Project Title / Name"
                    placeholder="e.g., GreenNest Heights"
                    error={!!errors.project_title}
                    helperText={errors.project_title?.message}
                    variant="outlined"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="project_type"
                control={control}
                rules={{ required: 'Project type is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.project_type}>
                    <InputLabel>Project Type</InputLabel>
                    <Select {...field} label="Project Type">
                      {projectTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="survey_number"
                control={control}
                rules={{ required: 'Survey number is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Survey Number"
                    placeholder="e.g., 124/2B"
                    error={!!errors.survey_number}
                    helperText={errors.survey_number?.message}
                    variant="outlined"
                  />
                )}
              />
            </Grid>
          </Grid>
        );
      
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="village_taluk_district"
                control={control}
                rules={{ required: 'Location details are required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Village / Taluk / District"
                    placeholder="e.g., Peelamedu / Coimbatore South / Coimbatore"
                    error={!!errors.village_taluk_district}
                    helperText={errors.village_taluk_district?.message}
                    variant="outlined"
                    multiline
                    rows={2}
                  />
                )}
              />
            </Grid>
          </Grid>
        );
      
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="patta_number"
                control={control}
                rules={{ required: 'Patta number is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Patta Number"
                    placeholder="e.g., P-987654"
                    error={!!errors.patta_number}
                    helperText={errors.patta_number?.message}
                    variant="outlined"
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="ec_number"
                control={control}
                rules={{ required: 'EC number is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Encumbrance Certificate (EC) Number"
                    placeholder="e.g., EC-2025-001234"
                    error={!!errors.ec_number}
                    helperText={errors.ec_number?.message}
                    variant="outlined"
                  />
                )}
              />
            </Grid>
          </Grid>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          🔑 New Building Plan Application
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Complete the 6 required fields below. All other information will be auto-detected 
          from GIS data and masterplan layers.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              {renderStepContent(activeStep)}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            
            <Box sx={{ flex: '1 1 auto' }} />
            
            {activeStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} />}
                size="large"
              >
                {loading ? 'Creating Project...' : 'Create Project & Start Analysis'}
              </Button>
            ) : (
              <Button onClick={handleNext} variant="contained">
                Next
              </Button>
            )}
          </Box>
        </form>

        <Box sx={{ mt: 4, p: 3, backgroundColor: 'background.default', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            ✅ What happens next?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. <strong>GIS Analysis:</strong> Auto-detect coordinates, elevation, zoning, land use, CRZ, flood zones<br/>
            2. <strong>Building Design:</strong> Input floor plans, setbacks, FSI, coverage details<br/>
            3. <strong>Compliance Check:</strong> Automated validation against DCR & NBC rules<br/>
            4. <strong>Document Upload:</strong> Submit drawings, photos, NOCs, and certificates<br/>
            5. <strong>Final Submission:</strong> Generate reports and submit to CMDA portal
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProjectForm;