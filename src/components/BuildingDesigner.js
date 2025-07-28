import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';

const BuildingDesigner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  const watchedValues = watch();

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    // Auto-calculate derived values when inputs change
    calculateDerivedValues();
  }, [watchedValues.total_buildup_area, watchedValues.ground_floor_area]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data.project);
      
      // Pre-populate form with existing data
      const p = response.data.project;
      if (p.building_height) setValue('building_height', p.building_height);
      if (p.number_of_floors) setValue('number_of_floors', p.number_of_floors);
      if (p.total_buildup_area) setValue('total_buildup_area', p.total_buildup_area);
      // ... populate other fields
      
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const calculateDerivedValues = () => {
    const plotArea = 2000; // Demo value - in production, would be from GIS polygon
    const totalBuildup = watchedValues.total_buildup_area;
    const groundFloorArea = watchedValues.ground_floor_area;

    if (totalBuildup && plotArea) {
      const fsi = totalBuildup / plotArea;
      setValue('fsi_used', parseFloat(fsi.toFixed(3)));
    }

    if (groundFloorArea && plotArea) {
      const coverage = (groundFloorArea / plotArea) * 100;
      setValue('coverage_percentage', parseFloat(coverage.toFixed(2)));
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    setError('');
    
    try {
      await axios.post(`/api/projects/${id}/building-details`, data);
      navigate(`/project/${id}/compliance`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save building details');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    'Basic Building Info',
    'Floor & Area Details',
    'Setbacks & Compliance',
    'Utilities & Infrastructure'
  ];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="number_of_floors"
                control={control}
                rules={{ required: 'Number of floors is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.number_of_floors}>
                    <InputLabel>Number of Floors</InputLabel>
                    <Select {...field} label="Number of Floors">
                      <MenuItem value="G+0">Ground Only (G+0)</MenuItem>
                      <MenuItem value="G+1">Ground + 1 (G+1)</MenuItem>
                      <MenuItem value="G+2">Ground + 2 (G+2)</MenuItem>
                      <MenuItem value="G+3">Ground + 3 (G+3)</MenuItem>
                      <MenuItem value="G+4">Ground + 4 (G+4)</MenuItem>
                      <MenuItem value="G+5">Ground + 5 (G+5)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="building_height"
                control={control}
                rules={{ 
                  required: 'Building height is required',
                  min: { value: 3, message: 'Minimum height is 3m' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Building Height (meters)"
                    type="number"
                    inputProps={{ step: 0.1, min: 3 }}
                    error={!!errors.building_height}
                    helperText={errors.building_height?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="floor_usage_type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Floor Usage Type</InputLabel>
                    <Select {...field} label="Floor Usage Type">
                      <MenuItem value="All Residential">All Residential</MenuItem>
                      <MenuItem value="All Commercial">All Commercial</MenuItem>
                      <MenuItem value="Mixed Use">Mixed Use</MenuItem>
                      <MenuItem value="Ground Commercial + Residential">Ground Commercial + Residential</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="number_of_units"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Number of Units/Flats"
                    type="number"
                    inputProps={{ min: 1 }}
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="ground_floor_area"
                control={control}
                rules={{ required: 'Ground floor area is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Ground Floor Area (sq.m)"
                    type="number"
                    inputProps={{ step: 0.1, min: 1 }}
                    error={!!errors.ground_floor_area}
                    helperText={errors.ground_floor_area?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="total_buildup_area"
                control={control}
                rules={{ required: 'Total built-up area is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Total Built-up Area (sq.m)"
                    type="number"
                    inputProps={{ step: 0.1, min: 1 }}
                    error={!!errors.total_buildup_area}
                    helperText={errors.total_buildup_area?.message}
                  />
                )}
              />
            </Grid>

            {/* Auto-calculated fields */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Coverage Percentage (%)"
                value={watchedValues.coverage_percentage || ''}
                InputProps={{ readOnly: true }}
                helperText="Auto-calculated from ground floor area"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="FSI Used"
                value={watchedValues.fsi_used || ''}
                InputProps={{ readOnly: true }}
                helperText="Auto-calculated from total built-up area"
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <strong>Plot Area:</strong> 2000 sq.m (from GIS boundary)<br/>
                <strong>Max Permissible FSI:</strong> 1.5 (R2 zone, 9m road)<br/>
                <strong>Max Coverage:</strong> 70% (R2 zone)
              </Alert>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Setbacks (in meters)
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Controller
                name="setback_front"
                control={control}
                rules={{ required: 'Front setback is required', min: { value: 3, message: 'Minimum 3m required' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Front Setback"
                    type="number"
                    inputProps={{ step: 0.1, min: 0 }}
                    error={!!errors.setback_front}
                    helperText={errors.setback_front?.message || "Min: 3m (R2 zone)"}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="setback_rear"
                control={control}
                rules={{ required: 'Rear setback is required', min: { value: 2.5, message: 'Minimum 2.5m required' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Rear Setback"
                    type="number"
                    inputProps={{ step: 0.1, min: 0 }}
                    error={!!errors.setback_rear}
                    helperText={errors.setback_rear?.message || "Min: 2.5m (R2 zone)"}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="setback_left"
                control={control}
                rules={{ required: 'Left setback is required', min: { value: 2, message: 'Minimum 2m required' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Left Side Setback"
                    type="number"
                    inputProps={{ step: 0.1, min: 0 }}
                    error={!!errors.setback_left}
                    helperText={errors.setback_left?.message || "Min: 2m (R2 zone)"}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Controller
                name="setback_right"
                control={control}
                rules={{ required: 'Right setback is required', min: { value: 2, message: 'Minimum 2m required' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Right Side Setback"
                    type="number"
                    inputProps={{ step: 0.1, min: 0 }}
                    error={!!errors.setback_right}
                    helperText={errors.setback_right?.message || "Min: 2m (R2 zone)"}
                  />
                )}
              />
            </Grid>

            {/* Parking */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Parking Provision
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="car_parking_spaces"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Car Parking Spaces"
                    type="number"
                    inputProps={{ min: 0 }}
                    helperText="Required: 1 per unit + visitor parking"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="bike_parking_spaces"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Bike Parking Spaces"
                    type="number"
                    inputProps={{ min: 0 }}
                    helperText="Required: 1 per unit"
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="waste_room_area"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Waste Room Area (sq.m)"
                    type="number"
                    inputProps={{ step: 0.1, min: 0 }}
                    helperText="Minimum 4 sq.m required"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="water_supply"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Water Supply Source</InputLabel>
                    <Select {...field} label="Water Supply Source">
                      <MenuItem value="Municipal">Municipal Supply</MenuItem>
                      <MenuItem value="Borewell">Borewell</MenuItem>
                      <MenuItem value="Borewell + Municipal">Borewell + Municipal</MenuItem>
                      <MenuItem value="Tanker">Tanker Supply</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="sewerage_system"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Sewerage System</InputLabel>
                    <Select {...field} label="Sewerage System">
                      <MenuItem value="UGD">Underground Drainage (UGD)</MenuItem>
                      <MenuItem value="Septic Tank">Septic Tank</MenuItem>
                      <MenuItem value="STP">Sewage Treatment Plant</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="electricity_source"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Electricity Source</InputLabel>
                    <Select {...field} label="Electricity Source">
                      <MenuItem value="TNEB - Single Phase">TNEB - Single Phase</MenuItem>
                      <MenuItem value="TNEB - 3 Phase">TNEB - 3 Phase</MenuItem>
                      <MenuItem value="TNEB + Solar">TNEB + Solar Backup</MenuItem>
                      <MenuItem value="TNEB + Genset">TNEB + Generator</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="rainwater_harvesting"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Rainwater Harvesting</InputLabel>
                    <Select {...field} label="Rainwater Harvesting">
                      <MenuItem value="Percolation Pit">Percolation Pit</MenuItem>
                      <MenuItem value="Recharge Well">Recharge Well</MenuItem>
                      <MenuItem value="Storage Tank">Storage Tank</MenuItem>
                      <MenuItem value="Multiple Systems">Multiple Systems</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="lift_provision"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Lift Provision</InputLabel>
                    <Select {...field} label="Lift Provision">
                      <MenuItem value="No Lift">No Lift Required</MenuItem>
                      <MenuItem value="1 Lift">1 Passenger Lift</MenuItem>
                      <MenuItem value="2 Lifts">2 Passenger Lifts</MenuItem>
                      <MenuItem value="Lift + Service">Passenger + Service Lift</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          🏗️ Building Design & Details
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Project: <strong>{project?.project_title}</strong> (ID: {project?.application_id})
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
                <StepContent>
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      {renderStepContent(index)}
                    </CardContent>
                  </Card>
                  
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(activeStep + 1)}
                      sx={{ mr: 1 }}
                      disabled={activeStep === steps.length - 1}
                    >
                      {activeStep === steps.length - 1 ? 'Finish' : 'Continue'}
                    </Button>
                    <Button
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep(activeStep - 1)}
                      sx={{ mr: 1 }}
                    >
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {activeStep === steps.length && (
            <Card sx={{ mt: 3, p: 3 }}>
              <Typography variant="h6" gutterBottom>
                All building details completed!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ready to save and proceed to compliance checking.
              </Typography>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving && <CircularProgress size={20} />}
                size="large"
              >
                {saving ? 'Saving...' : 'Save & Run Compliance Check'}
              </Button>
            </Card>
          )}
        </form>
      </Paper>
    </Box>
  );
};

export default BuildingDesigner;