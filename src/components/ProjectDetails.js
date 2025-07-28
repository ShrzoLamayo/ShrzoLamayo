import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Business as BuildingIcon,
  Assessment as ComplianceIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Send as SubmitIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import GISMap from './GISMap';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [complianceChecks, setComplianceChecks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [processingGIS, setProcessingGIS] = useState(false);
  const [processingCompliance, setProcessingCompliance] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data.project);
      setComplianceChecks(response.data.compliance_checks || []);
      setDocuments(response.data.documents || []);
    } catch (err) {
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const runGISAnalysis = async () => {
    setProcessingGIS(true);
    try {
      await axios.post(`/api/projects/${id}/gis-analysis`);
      await fetchProjectDetails(); // Refresh data
    } catch (err) {
      setError('GIS analysis failed');
    } finally {
      setProcessingGIS(false);
    }
  };

  const runComplianceCheck = async () => {
    setProcessingCompliance(true);
    try {
      await axios.post(`/api/projects/${id}/compliance-check`);
      await fetchProjectDetails(); // Refresh data
    } catch (err) {
      setError('Compliance check failed');
    } finally {
      setProcessingCompliance(false);
    }
  };

  const generateReport = async () => {
    try {
      const response = await axios.post(`/api/projects/${id}/generate-report`);
      // Open download URL
      window.open(response.data.download_url, '_blank');
    } catch (err) {
      setError('Report generation failed');
    }
  };

  const submitProject = async () => {
    try {
      await axios.post(`/api/projects/${id}/submit`);
      await fetchProjectDetails(); // Refresh data
    } catch (err) {
      setError('Project submission failed');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASSED': return 'success';
      case 'FAILED': return 'error';
      case 'WARNING': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {project.project_title}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Application ID: {project.application_id}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Chip label={project.status} color="primary" />
              {project.compliance_status && (
                <Chip 
                  label={`Compliance: ${project.compliance_status}`} 
                  color={getStatusColor(project.compliance_status)} 
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/project/${id}/design`)}
            >
              Edit Design
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={generateReport}
            >
              Download Report
            </Button>
            {project.compliance_status === 'PASSED' && project.status === 'DRAFT' && (
              <Button
                variant="contained"
                startIcon={<SubmitIcon />}
                onClick={submitProject}
                color="success"
              >
                Submit to CMDA
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Progress Indicators */}
      {(processingGIS || processingCompliance) && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            {processingGIS ? 'Running GIS Analysis...' : 'Running Compliance Checks...'}
          </Typography>
          <LinearProgress />
        </Paper>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="project details tabs">
          <Tab icon={<LocationIcon />} label="GIS & Location" />
          <Tab icon={<BuildingIcon />} label="Building Details" />
          <Tab icon={<ComplianceIcon />} label="Compliance" />
          <Tab icon={<DocumentIcon />} label="Documents" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* User Inputs */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  🔑 User Inputs (6 Required Fields)
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Project Title</strong></TableCell>
                      <TableCell>{project.project_title}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Project Type</strong></TableCell>
                      <TableCell>{project.project_type}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Survey Number</strong></TableCell>
                      <TableCell>{project.survey_number}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell>{project.village_taluk_district}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Patta Number</strong></TableCell>
                      <TableCell>{project.patta_number}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>EC Number</strong></TableCell>
                      <TableCell>{project.ec_number}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Auto-detected GIS Data */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="primary">
                    🤖 Auto-detected GIS Data
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={runGISAnalysis}
                    disabled={processingGIS}
                  >
                    Refresh GIS
                  </Button>
                </Box>
                
                {project.latitude ? (
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Coordinates</strong></TableCell>
                        <TableCell>{project.latitude?.toFixed(6)}°, {project.longitude?.toFixed(6)}°</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Elevation</strong></TableCell>
                        <TableCell>{project.elevation} m</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Land Type</strong></TableCell>
                        <TableCell>{project.land_type}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Road Width</strong></TableCell>
                        <TableCell>{project.road_width} m</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Zoning</strong></TableCell>
                        <TableCell>{project.zoning_classification}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Land Use</strong></TableCell>
                        <TableCell>{project.land_use}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>CRZ Classification</strong></TableCell>
                        <TableCell>{project.crz_zones}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Water Proximity</strong></TableCell>
                        <TableCell>{project.proximity_to_water} m</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <Alert severity="info">
                    GIS analysis not yet performed. 
                    <Button onClick={runGISAnalysis} sx={{ ml: 1 }}>
                      Run Analysis
                    </Button>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Map */}
          {project.latitude && project.longitude && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📍 Site Location Map
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <GISMap
                      latitude={project.latitude}
                      longitude={project.longitude}
                      sitePolygon={project.site_boundary_polygon}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  🏗️ Building & Design Details
                </Typography>
                {project.building_height ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell><strong>Number of Floors</strong></TableCell>
                            <TableCell>{project.number_of_floors || 'Not specified'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Building Height</strong></TableCell>
                            <TableCell>{project.building_height} m</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Total Built-up Area</strong></TableCell>
                            <TableCell>{project.total_buildup_area} sq.m</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Coverage %</strong></TableCell>
                            <TableCell>{project.coverage_percentage}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>FSI Used</strong></TableCell>
                            <TableCell>{project.fsi_used}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell><strong>Number of Units</strong></TableCell>
                            <TableCell>{project.number_of_units || 'Not specified'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Floor Usage</strong></TableCell>
                            <TableCell>{project.floor_usage_type || 'Not specified'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Waste Room Area</strong></TableCell>
                            <TableCell>{project.waste_room_area || 'Not specified'} sq.m</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info">
                    Building details not yet provided.
                    <Button onClick={() => navigate(`/project/${id}/design`)} sx={{ ml: 1 }}>
                      Add Building Details
                    </Button>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="primary">
                    ⚙️ Compliance Check Results
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<ComplianceIcon />}
                    onClick={runComplianceCheck}
                    disabled={processingCompliance || !project.building_height}
                  >
                    Run Compliance Check
                  </Button>
                </Box>

                {complianceChecks.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Rule</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell><strong>Details</strong></TableCell>
                          <TableCell><strong>Value</strong></TableCell>
                          <TableCell><strong>Threshold</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {complianceChecks.map((check, index) => (
                          <TableRow key={index}>
                            <TableCell>{check.rule_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableCell>
                            <TableCell>
                              <Chip 
                                label={check.status} 
                                color={getStatusColor(check.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{check.message}</TableCell>
                            <TableCell>{check.value !== null ? check.value : 'N/A'}</TableCell>
                            <TableCell>{check.threshold !== null ? check.threshold : 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    No compliance checks performed yet. Building details are required to run compliance checks.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  📑 Submitted Documents
                </Typography>
                {documents.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Document Type</strong></TableCell>
                          <TableCell><strong>File Name</strong></TableCell>
                          <TableCell><strong>Upload Date</strong></TableCell>
                          <TableCell><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {documents.map((doc, index) => (
                          <TableRow key={index}>
                            <TableCell>{doc.document_type}</TableCell>
                            <TableCell>{doc.file_name}</TableCell>
                            <TableCell>{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button size="small" startIcon={<DownloadIcon />}>
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    No documents uploaded yet.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ProjectDetails;