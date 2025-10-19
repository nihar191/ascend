// backend/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authConfig from '../config/auth.js';
import pool from '../config/database.js';

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpire }
  );
};

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check if username already exists
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(400).json({ 
        error: 'Username already taken' 
      });
    }

    // Check if email already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    // Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await User.create({
      username,
      email,
      passwordHash,
      displayName: displayName || username
    });

    // Generate JWT token
    const token = generateToken(user.id, user.username, 'user');

    // Return user data and token (exclude sensitive fields)
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        rating: user.rating,
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
    });
  }
};

/**
 * Login existing user
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Compare provided password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.username, user.role);

    // Return user data and token
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        rating: user.rating,
        role: user.role,
        stats: {
          totalMatches: user.total_matches,
          wins: user.wins,
          losses: user.losses,
        }
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
};

/**
 * Get current user profile (requires authentication)
 */
export const getProfile = async (req, res) => {
  try {
    // User is already attached to req by authenticate middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      rating: user.rating,
      role: user.role,
      stats: {
        totalMatches: user.total_matches,
        wins: user.wins,
        losses: user.losses,
        winRate: user.total_matches > 0 
          ? ((user.wins / user.total_matches) * 100).toFixed(1) 
          : 0
      },
      createdAt: user.created_at
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Update user profile (requires authentication)
 */
export const updateProfile = async (req, res) => {
  try {
    const { displayName, avatarUrl } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const updatedUser = await User.updateProfile(req.user.id, updates);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Verify token validity
 */
export const verifyToken = (req, res) => {
  // If we reach here, token is valid (authenticate middleware passed)
  res.json({ 
    valid: true,
    user: req.user 
  });
};

/**
 * Temporary endpoint to make a user admin (remove after use)
 */
export const makeAdmin = async (req, res) => {
  try {
    const { username, secret } = req.body;
    
    // Simple secret check (change this)
    if (secret !== 'ascend-admin-2024') {
      return res.status(401).json({ error: 'Invalid secret' });
    }
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE username = $2 RETURNING id, username, role',
      ['admin', username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'User promoted to admin',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
};