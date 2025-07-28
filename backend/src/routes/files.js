const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const unzipper = require('unzipper');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// File storage configuration
const upload = multer({
  storage: process.env.AWS_ACCESS_KEY_ID ? multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET,
    key: function (req, file, cb) {
      const projectId = req.params.projectId;
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      cb(null, `projects/${projectId}/${timestamp}_${file.originalname}`);
    }
  }) : multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(__dirname, '../../uploads', req.params.projectId);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      cb(null, `${timestamp}_${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/pdf',
      'application/dwg',
      'application/acad',
      'application/zip',
      'image/jpeg',
      'image/png',
      'application/json',
      'text/plain'
    ];
    
    const allowedExtensions = ['.dwg', '.pdf', '.zip', '.jpg', '.jpeg', '.png', '.json', '.txt', '.shp', '.dbf', '.shx'];
    const extension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new AppError('File type not supported', 400), false);
    }
  }
});

// Autodesk Forge API integration
class ForgeService {
  constructor() {
    this.clientId = process.env.FORGE_CLIENT_ID;
    this.clientSecret = process.env.FORGE_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://developer.api.autodesk.com/authentication/v1/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          scope: 'data:read data:write data:create bucket:create bucket:read'
        })
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      logger.error('Forge authentication failed:', error);
      throw new AppError('Failed to authenticate with Autodesk Forge', 500);
    }
  }

  async uploadToBucket(buffer, fileName) {
    const token = await this.getAccessToken();
    const bucketKey = process.env.FORGE_BUCKET_KEY || 'zoning-bucket';

    try {
      // Create bucket if it doesn't exist
      await fetch(`https://developer.api.autodesk.com/oss/v2/buckets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucketKey: bucketKey,
          policyKey: 'transient'
        })
      });

      // Upload file
      const uploadResponse = await fetch(`https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/stream'
        },
        body: buffer
      });

      const uploadData = await uploadResponse.json();
      return uploadData;
    } catch (error) {
      logger.error('Forge upload failed:', error);
      throw new AppError('Failed to upload to Autodesk Forge', 500);
    }
  }

  async translateFile(urn) {
    const token = await this.getAccessToken();

    try {
      const response = await fetch('https://developer.api.autodesk.com/modelderivative/v2/designdata/job', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            urn: urn
          },
          output: {
            formats: [
              {
                type: 'svf',
                views: ['2d', '3d']
              },
              {
                type: 'obj'
              }
            ]
          }
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Forge translation failed:', error);
      throw new AppError('Failed to translate file with Autodesk Forge', 500);
    }
  }
}

// File processing utilities
class FileProcessor {
  static async processPDF(buffer, fileName) {
    try {
      const pdfData = await pdfParse(buffer);
      
      // Extract text for metadata
      const text = pdfData.text;
      const metadata = {
        pages: pdfData.numpages,
        text: text.substring(0, 1000), // First 1000 chars
        extractedData: {
          dimensions: FileProcessor.extractDimensions(text),
          coordinates: FileProcessor.extractCoordinates(text),
          areas: FileProcessor.extractAreas(text)
        }
      };

      return {
        type: 'pdf',
        metadata,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('PDF processing failed:', error);
      return { type: 'pdf', error: error.message };
    }
  }

  static async processDWG(buffer, fileName) {
    const forge = new ForgeService();
    
    try {
      // Upload to Forge
      const uploadResult = await forge.uploadToBucket(buffer, fileName);
      
      // Start translation
      const translationResult = await forge.translateFile(uploadResult.objectId);
      
      return {
        type: 'dwg',
        forgeUrn: uploadResult.objectId,
        translationUrn: translationResult.urn,
        status: 'processing',
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('DWG processing failed:', error);
      return { type: 'dwg', error: error.message };
    }
  }

  static async processShapefile(buffer, fileName) {
    // Extract shapefile components
    const extractPath = path.join(__dirname, '../../temp', Date.now().toString());
    
    try {
      fs.mkdirSync(extractPath, { recursive: true });
      
      // Extract ZIP if it's a zipped shapefile
      if (fileName.endsWith('.zip')) {
        await new Promise((resolve, reject) => {
          const stream = require('stream');
          const readable = new stream.Readable();
          readable.push(buffer);
          readable.push(null);
          
          readable
            .pipe(unzipper.Extract({ path: extractPath }))
            .on('close', resolve)
            .on('error', reject);
        });
      }

      // Read shapefile components (.shp, .dbf, .shx)
      const files = fs.readdirSync(extractPath);
      const shpFile = files.find(f => f.endsWith('.shp'));
      
      if (!shpFile) {
        throw new Error('No .shp file found in archive');
      }

      // For now, return metadata - in production, use a library like 'shapefile'
      return {
        type: 'shapefile',
        files: files,
        mainFile: shpFile,
        extractPath: extractPath,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Shapefile processing failed:', error);
      return { type: 'shapefile', error: error.message };
    }
  }

  static extractDimensions(text) {
    // Regex patterns for common dimension formats
    const patterns = [
      /(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)\s*(?:m|meters?|ft|feet?)/gi,
      /(\d+\.?\d*)\s*(?:m|meters?|ft|feet?)\s*[x×]\s*(\d+\.?\d*)\s*(?:m|meters?|ft|feet?)/gi
    ];

    const dimensions = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        dimensions.push({
          width: parseFloat(match[1]),
          height: parseFloat(match[2]),
          unit: match[0].includes('ft') ? 'feet' : 'meters'
        });
      }
    });

    return dimensions;
  }

  static extractCoordinates(text) {
    // Extract latitude/longitude coordinates
    const coordPattern = /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/g;
    const coordinates = [];
    
    let match;
    while ((match = coordPattern.exec(text)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      // Basic validation for valid coordinates
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        coordinates.push([lng, lat]);
      }
    }

    return coordinates;
  }

  static extractAreas(text) {
    // Extract area measurements
    const areaPattern = /(\d+\.?\d*)\s*(?:sq\s*m|m²|square\s*meters?|sq\s*ft|ft²|square\s*feet?)/gi;
    const areas = [];
    
    let match;
    while ((match = areaPattern.exec(text)) !== null) {
      areas.push({
        value: parseFloat(match[1]),
        unit: match[0].includes('ft') ? 'square_feet' : 'square_meters'
      });
    }

    return areas;
  }
}

// Upload files for a project
router.post('/upload/:projectId', upload.array('files', 10), async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const files = req.files;

    if (!files || files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    // Check if user has access to this project
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return next(new AppError('Project not found or access denied', 404));
    }

    const uploadedFiles = [];

    for (const file of files) {
      try {
        // Determine file type
        const extension = path.extname(file.originalname).toLowerCase();
        let fileType = 'unknown';
        
        if (extension === '.pdf') fileType = 'pdf';
        else if (extension === '.dwg') fileType = 'dwg';
        else if (['.zip', '.shp'].includes(extension)) fileType = 'shapefile';
        else if (['.jpg', '.jpeg', '.png'].includes(extension)) fileType = 'image';

        // Process file based on type
        let processingResult = {};
        const buffer = file.buffer || fs.readFileSync(file.path);

        switch (fileType) {
          case 'pdf':
            processingResult = await FileProcessor.processPDF(buffer, file.originalname);
            break;
          case 'dwg':
            processingResult = await FileProcessor.processDWG(buffer, file.originalname);
            break;
          case 'shapefile':
            processingResult = await FileProcessor.processShapefile(buffer, file.originalname);
            break;
          default:
            processingResult = { type: fileType, processedAt: new Date().toISOString() };
        }

        // Save file record to database
        const fileRecord = await query(`
          INSERT INTO project_files (
            project_id, filename, original_filename, file_type, file_size, s3_key
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          projectId,
          file.filename || file.key,
          file.originalname,
          fileType,
          file.size,
          file.key || file.filename
        ]);

        uploadedFiles.push({
          ...fileRecord.rows[0],
          processing_result: processingResult
        });

        // Clean up local file if using local storage
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

      } catch (fileError) {
        logger.error(`Failed to process file ${file.originalname}:`, fileError);
        uploadedFiles.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        project_id: projectId,
        uploaded_files: uploadedFiles
      }
    });

  } catch (error) {
    logger.error('File upload error:', error);
    next(error);
  }
});

// Get files for a project
router.get('/:projectId', async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    // Check project access
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return next(new AppError('Project not found or access denied', 404));
    }

    const files = await query(
      'SELECT * FROM project_files WHERE project_id = $1 ORDER BY upload_date DESC',
      [projectId]
    );

    res.status(200).json({
      status: 'success',
      results: files.rows.length,
      data: {
        files: files.rows
      }
    });

  } catch (error) {
    logger.error('Get files error:', error);
    next(error);
  }
});

// Download/view file
router.get('/download/:fileId', async (req, res, next) => {
  try {
    const fileId = req.params.fileId;

    const fileRecord = await query(`
      SELECT pf.*, p.user_id 
      FROM project_files pf
      JOIN projects p ON pf.project_id = p.id
      WHERE pf.id = $1
    `, [fileId]);

    if (fileRecord.rows.length === 0) {
      return next(new AppError('File not found', 404));
    }

    const file = fileRecord.rows[0];

    // Check access
    if (file.user_id !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Access denied', 403));
    }

    if (file.s3_key && process.env.AWS_ACCESS_KEY_ID) {
      // Generate presigned URL for S3
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: file.s3_key
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      res.status(200).json({
        status: 'success',
        data: {
          download_url: signedUrl,
          filename: file.original_filename,
          expires_in: 3600
        }
      });
    } else {
      // Local file
      const filePath = path.join(__dirname, '../../uploads', file.project_id.toString(), file.filename);
      
      if (!fs.existsSync(filePath)) {
        return next(new AppError('File not found on disk', 404));
      }

      res.download(filePath, file.original_filename);
    }

  } catch (error) {
    logger.error('File download error:', error);
    next(error);
  }
});

// Delete file
router.delete('/:fileId', async (req, res, next) => {
  try {
    const fileId = req.params.fileId;

    const fileRecord = await query(`
      SELECT pf.*, p.user_id 
      FROM project_files pf
      JOIN projects p ON pf.project_id = p.id
      WHERE pf.id = $1
    `, [fileId]);

    if (fileRecord.rows.length === 0) {
      return next(new AppError('File not found', 404));
    }

    const file = fileRecord.rows[0];

    // Check access
    if (file.user_id !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Access denied', 403));
    }

    // Delete from S3 if applicable
    if (file.s3_key && process.env.AWS_ACCESS_KEY_ID) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: file.s3_key
      });
      await s3Client.send(deleteCommand);
    } else {
      // Delete local file
      const filePath = path.join(__dirname, '../../uploads', file.project_id.toString(), file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await query('DELETE FROM project_files WHERE id = $1', [fileId]);

    res.status(204).json({
      status: 'success',
      data: null
    });

  } catch (error) {
    logger.error('File delete error:', error);
    next(error);
  }
});

// Process file with AI/ML analysis
router.post('/analyze/:fileId', async (req, res, next) => {
  try {
    const fileId = req.params.fileId;

    const fileRecord = await query(`
      SELECT pf.*, p.user_id 
      FROM project_files pf
      JOIN projects p ON pf.project_id = p.id
      WHERE pf.id = $1
    `, [fileId]);

    if (fileRecord.rows.length === 0) {
      return next(new AppError('File not found', 404));
    }

    const file = fileRecord.rows[0];

    // Check access
    if (file.user_id !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Access denied', 403));
    }

    // Placeholder for AI analysis
    const analysisResult = {
      file_id: fileId,
      analysis_type: 'ai_extraction',
      extracted_features: {
        building_footprint: null,
        floor_plans: [],
        dimensions: [],
        annotations: []
      },
      confidence_score: 0.85,
      processed_at: new Date().toISOString()
    };

    res.status(200).json({
      status: 'success',
      data: analysisResult
    });

  } catch (error) {
    logger.error('File analysis error:', error);
    next(error);
  }
});

module.exports = router;