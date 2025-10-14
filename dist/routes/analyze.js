import { Router } from 'express';
import { analyze } from '../controllers/analyzeController.js';
const router = Router();
router.get('/', analyze);
export default router;
//# sourceMappingURL=analyze.js.map