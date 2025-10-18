// backend/middleware/validation.middleware.js
import { body, param, validationResult } from 'express-validator';

/**
 * Middleware to check validation results and return errors
 * Must be used after validation chain
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      }))
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .escape(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email too long'),
  
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be between 8 and 100 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[@$!%*?&#]/)
    .withMessage('Password must contain at least one special character (@$!%*?&#)'),
  
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name too long')
    .escape(),
  
  validate
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .escape(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validate
];

/**
 * Validation rules for profile updates
 */
export const updateProfileValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name too long')
    .escape(),
  
  body('avatarUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar URL must be valid')
    .isLength({ max: 500 })
    .withMessage('Avatar URL too long'),
  
  validate
];

/**
 * Validation rules for problem creation
 */
export const createProblemValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .escape(),

  body('description')
    .trim()
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters'),

  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),

  body('points')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points must be between 1 and 1000'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('testCases')
    .isArray({ min: 1 })
    .withMessage('At least one test case is required'),

  validate
];

/**
 * Validation rules for problem updates
 */
export const updateProblemValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters'),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),

  body('points')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points must be between 1 and 1000'),

  validate
];

/**
 * Validation for AI problem generation
 */
export const generateProblemValidation = [
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('hint')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Hint must be less than 500 characters'),

  validate
];

/**
 * Validation for user updates by admin
 */
export const adminUpdateUserValidation = [
  body('role')
    .optional()
    .isIn(['user', 'admin', 'banned'])
    .withMessage('Role must be user, admin, or banned'),
  
  body('rating')
    .optional()
    .isInt({ min: 0, max: 5000 })
    .withMessage('Rating must be between 0 and 5000'),
  
  validate
];

/**
 * Validation for bulk problem generation
 */
export const bulkGenerateValidation = [
  body('count')
    .isInt({ min: 1, max: 10 })
    .withMessage('Count must be between 1 and 10'),
  
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  validate
];

/**
 * Validation for bulk operations
 */
export const bulkOperationValidation = [
  body('problemIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Problem IDs must be an array with 1-50 items'),
  
  body('problemIds.*')
    .isInt()
    .withMessage('Each problem ID must be an integer'),
  
  validate
];