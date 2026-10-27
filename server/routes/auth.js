import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, resetDatabaseFresh } from '../config/db.js';
import { authenticateToken, requireRole, JWT_SECRET } from '../middleware/auth.js';
import { recordAuditLog } from '../middleware/auditLogger.js';

const router = express.Router();

// User Login (supports Role or Username)
router.post('/login', async (req, res) => {
  try {
    const { username, role, password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const allUsers = await db.users.find({});
    let user = null;

    if (role) {
      user = allUsers.find(u => 
        u.role === role || 
        (role === 'QA_MANAGER' && (u.role === 'QA_QC_MANAGER' || u.role === 'QA_MANAGER')) ||
        (role === 'QA_QC_MANAGER' && (u.role === 'QA_QC_MANAGER' || u.role === 'QA_MANAGER'))
      );
    }

    if (!user && username) {
      const uLower = username.toLowerCase().trim();
      user = allUsers.find(u => 
        u.username.toLowerCase() === uLower || 
        u.role.toLowerCase() === uLower ||
        (uLower === 'manager' && (u.role === 'QA_QC_MANAGER' || u.role === 'QA_MANAGER')) ||
        (uLower === 'qa' && (u.role === 'QA_QC_MANAGER' || u.role === 'QA_MANAGER')) ||
        (uLower === 'operator' && u.role === 'OPERATOR') ||
        (uLower === 'auditor' && u.role === 'AUDITOR') ||
        (uLower === 'admin' && u.role === 'ADMIN')
      );
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid user or role selected.' });
    }

    if (!user.active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact Administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password for this role.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await recordAuditLog({
      userId: user.id,
      username: user.fullName,
      userRole: user.role,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      action: 'USER_LOGIN',
      resourceType: 'AUTH',
      resourceId: user.id,
      details: `User ${user.fullName} (${user.role}) logged in successfully.`,
      fieldChanged: 'SESSION_STATUS',
      oldValue: 'OFFLINE',
      newValue: 'ACTIVE'
    });

    const { passwordHash, pinHash, ...safeUser } = user;
    res.json({
      success: true,
      token,
      user: safeUser,
      message: `Welcome, ${user.fullName}`
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// Quick 1-Click Role Switcher
router.post('/switch-role', async (req, res) => {
  try {
    const { targetRole } = req.body;
    const allUsers = await db.users.find({});
    
    let targetUser = allUsers.find(u => 
      u.role === targetRole ||
      (targetRole === 'QA_MANAGER' && (u.role === 'QA_QC_MANAGER' || u.role === 'QA_MANAGER')) ||
      (targetRole === 'QA_QC_MANAGER' && (u.role === 'QA_QC_MANAGER' || u.role === 'QA_MANAGER'))
    );

    if (!targetUser) {
      targetUser = allUsers[0];
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: `No active user found for role ${targetRole}` });
    }

    const token = jwt.sign(
      { id: targetUser.id, username: targetUser.username, role: targetUser.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const { passwordHash, pinHash, ...safeUser } = targetUser;
    res.json({
      success: true,
      token,
      user: safeUser,
      message: `Switched role to ${targetUser.role} (${targetUser.fullName})`
    });
  } catch (err) {
    console.error('Switch role error:', err);
    res.status(500).json({ success: false, message: 'Failed to switch demo role.' });
  }
});

// Reset Fresh
router.post('/reset-fresh', async (req, res) => {
  try {
    await resetDatabaseFresh();
    res.json({
      success: true,
      message: 'Database reset to clean fresh state.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset database.' });
  }
});

// Get current profile
router.get('/profile', authenticateToken, async (req, res) => {
  const { passwordHash, pinHash, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// List all users
router.get('/users', authenticateToken, async (req, res) => {
  const users = await db.users.find({});
  const safeUsers = users.map(({ passwordHash, pinHash, ...rest }) => rest);
  res.json({ success: true, users: safeUsers });
});

export default router;
