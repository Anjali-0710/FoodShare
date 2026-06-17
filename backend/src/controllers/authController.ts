import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { mockUsers, MockUser } from '../config/mockDb';
import { getDbStatus } from '../config/db';
import { sendVerificationEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'foodshare-super-secret-key';

const generateToken = (user: { id: string; email: string; role: string; name: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role, contactNumber, address, latitude, longitude, ngoCapacity, foodTypePreference } = req.body;

  if (!name || !email || !password || !role || !contactNumber) {
    return res.status(400).json({ success: false, message: 'Please provide all mandatory fields' });
  }

  try {
    const isDb = getDbStatus();
    
    // Check if email already exists
    let userExists = false;
    if (isDb) {
      const dbUser = await User.findOne({ email });
      if (dbUser) userExists = true;
    } else {
      userExists = mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const gpsLocation = latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : undefined;

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    let newUser: any;

    if (isDb) {
      const createdUser = await User.create({
        name,
        email,
        passwordHash,
        role,
        contactNumber,
        address,
        gpsLocation,
        ngoCapacity: role === 'ngo' ? (ngoCapacity || 100) : undefined,
        foodTypePreference: (role === 'ngo' || role === 'volunteer') ? (foodTypePreference || []) : undefined,
        isVerified: false,
        verificationCode: otp,
        verificationExpires: expires
      });
      
      newUser = {
        id: createdUser._id.toString(),
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        contactNumber: createdUser.contactNumber,
        address: createdUser.address,
        gpsLocation: createdUser.gpsLocation
      };
    } else {
      const mockId = `usr_${role}_${Date.now()}`;
      const mockUserObj: MockUser = {
        id: mockId,
        name,
        email,
        passwordHash,
        role,
        contactNumber,
        address: address || '',
        gpsLocation: gpsLocation || { latitude: 28.6139, longitude: 77.2090 }, // Default Delhi coords
        ngoCapacity: role === 'ngo' ? (Number(ngoCapacity) || 100) : undefined,
        foodTypePreference: (role === 'ngo' || role === 'volunteer') ? (foodTypePreference || []) : [],
        volunteerScore: 0,
        completedPickups: 0,
        isVerified: false,
        verificationCode: otp,
        verificationExpires: expires,
        createdAt: new Date()
      };
      mockUsers.push(mockUserObj);
      newUser = {
        id: mockUserObj.id,
        name: mockUserObj.name,
        email: mockUserObj.email,
        role: mockUserObj.role,
        contactNumber: mockUserObj.contactNumber,
        address: mockUserObj.address,
        gpsLocation: mockUserObj.gpsLocation
      };
    }

    console.info(`[FoodShare Auth] Email verification code requested for: ${email}. Code generated: ${otp}`);
    
    // Send the real verification email via Nodemailer
    await sendVerificationEmail(email, otp);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email using the OTP sent.',
      email
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    const isDb = getDbStatus();
    let user: any = null;
    let isVerified = true;

    if (isDb) {
      const dbUser = await User.findOne({ email });
      if (dbUser) {
        const isMatch = await bcrypt.compare(password, dbUser.passwordHash);
        if (isMatch) {
          if (dbUser.isVerified === false) {
            isVerified = false;
            // Regenerate verification code if missing or expired
            let otp = dbUser.verificationCode;
            let expires = dbUser.verificationExpires;
            if (!otp || !expires || expires < new Date()) {
              otp = Math.floor(100000 + Math.random() * 900000).toString();
              expires = new Date(Date.now() + 5 * 60 * 1000);
              dbUser.verificationCode = otp;
              dbUser.verificationExpires = expires;
              await dbUser.save();
            }
            console.info(`[FoodShare Auth] Unverified login attempt for: ${email}. Code: ${otp}`);
            
            // Send verification email via Nodemailer
            await sendVerificationEmail(email, otp);

            return res.status(403).json({
              success: false,
              message: 'Please verify your email address before logging in.',
              isVerified: false,
              email
            });
          }

          user = {
            id: dbUser._id.toString(),
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            contactNumber: dbUser.contactNumber,
            address: dbUser.address,
            gpsLocation: dbUser.gpsLocation,
            ngoCapacity: dbUser.ngoCapacity,
            foodTypePreference: dbUser.foodTypePreference,
            volunteerScore: dbUser.volunteerScore,
            completedPickups: dbUser.completedPickups
          };
        }
      }
    } else {
      const mockUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (mockUser) {
        const isMatch = await bcrypt.compare(password, mockUser.passwordHash);
        if (isMatch) {
          if (mockUser.isVerified === false) {
            isVerified = false;
            let otp = mockUser.verificationCode;
            let expires = mockUser.verificationExpires;
            if (!otp || !expires || expires < new Date()) {
              otp = Math.floor(100000 + Math.random() * 900000).toString();
              expires = new Date(Date.now() + 5 * 60 * 1000);
              mockUser.verificationCode = otp;
              mockUser.verificationExpires = expires;
            }
            console.info(`[FoodShare Auth] Unverified login attempt for: ${email}. Code: ${otp}`);
            
            // Send verification email via Nodemailer
            await sendVerificationEmail(email, otp);

            return res.status(403).json({
              success: false,
              message: 'Please verify your email address before logging in.',
              isVerified: false,
              email
            });
          }

          user = {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            role: mockUser.role,
            contactNumber: mockUser.contactNumber,
            address: mockUser.address,
            gpsLocation: mockUser.gpsLocation,
            ngoCapacity: mockUser.ngoCapacity,
            foodTypePreference: mockUser.foodTypePreference,
            volunteerScore: mockUser.volunteerScore,
            completedPickups: mockUser.completedPickups
          };
        }
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide email address' });
  }

  try {
    const isDb = getDbStatus();
    let userFound = false;

    // Generate a secure random 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    if (isDb) {
      const dbUser = await User.findOneAndUpdate(
        { email },
        { resetPasswordCode: resetCode, resetPasswordExpires: expires }
      );
      if (dbUser) userFound = true;
    } else {
      const mockUserIndex = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (mockUserIndex !== -1) {
        mockUsers[mockUserIndex].resetPasswordCode = resetCode;
        mockUsers[mockUserIndex].resetPasswordExpires = expires;
        userFound = true;
      }
    }

    if (!userFound) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    console.info(`[FoodShare Auth] Password reset requested for: ${email}. Code generated: ${resetCode}`);

    return res.status(200).json({
      success: true,
      message: 'Verification code generated successfully.',
      code: resetCode // Directly return code in JSON response for demo/test ease
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Server error during password reset', error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide email, verification code, and new password' });
  }

  try {
    const isDb = getDbStatus();
    let userFound = false;
    let codeValid = false;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (isDb) {
      const user = await User.findOne({ email });
      if (user) {
        userFound = true;
        if (
          user.resetPasswordCode === code &&
          user.resetPasswordExpires &&
          user.resetPasswordExpires > new Date()
        ) {
          codeValid = true;
          user.passwordHash = passwordHash;
          user.resetPasswordCode = undefined;
          user.resetPasswordExpires = undefined;
          await user.save();
        }
      }
    } else {
      const mockUserIndex = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (mockUserIndex !== -1) {
        userFound = true;
        const mockUser = mockUsers[mockUserIndex];
        if (
          mockUser.resetPasswordCode === code &&
          mockUser.resetPasswordExpires &&
          mockUser.resetPasswordExpires > new Date()
        ) {
          codeValid = true;
          mockUser.passwordHash = passwordHash;
          mockUser.resetPasswordCode = undefined;
          mockUser.resetPasswordExpires = undefined;
        }
      }
    }

    if (!userFound) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    if (!codeValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error during password reset', error: error.message });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const { name, contactNumber, address } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  try {
    const isDb = getDbStatus();
    const userId = req.user!.id;
    let updatedUser: any = null;

    if (isDb) {
      const dbUser = await User.findByIdAndUpdate(
        userId,
        { name, contactNumber, address },
        { new: true }
      );
      if (dbUser) {
        updatedUser = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          contactNumber: dbUser.contactNumber,
          address: dbUser.address,
          gpsLocation: dbUser.gpsLocation,
          ngoCapacity: dbUser.ngoCapacity,
          foodTypePreference: dbUser.foodTypePreference,
          volunteerScore: dbUser.volunteerScore,
          completedPickups: dbUser.completedPickups
        };
      }
    } else {
      const mockUserIndex = mockUsers.findIndex(u => u.id === userId);
      if (mockUserIndex !== -1) {
        mockUsers[mockUserIndex].name = name;
        mockUsers[mockUserIndex].contactNumber = contactNumber;
        mockUsers[mockUserIndex].address = address;
        
        const mockUser = mockUsers[mockUserIndex];
        updatedUser = {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          contactNumber: mockUser.contactNumber,
          address: mockUser.address,
          gpsLocation: mockUser.gpsLocation,
          ngoCapacity: mockUser.ngoCapacity,
          foodTypePreference: mockUser.foodTypePreference,
          volunteerScore: mockUser.volunteerScore,
          completedPickups: mockUser.completedPickups
        };
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating profile', error: error.message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Please provide email and verification code' });
  }

  try {
    const isDb = getDbStatus();
    let userFound = false;
    let codeValid = false;
    let verifiedUserObj: any = null;

    if (isDb) {
      const user = await User.findOne({ email });
      if (user) {
        userFound = true;
        if (
          user.verificationCode === code &&
          user.verificationExpires &&
          user.verificationExpires > new Date()
        ) {
          codeValid = true;
          user.isVerified = true;
          user.verificationCode = undefined;
          user.verificationExpires = undefined;
          await user.save();

          verifiedUserObj = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            contactNumber: user.contactNumber,
            address: user.address,
            gpsLocation: user.gpsLocation,
            ngoCapacity: user.ngoCapacity,
            foodTypePreference: user.foodTypePreference,
            volunteerScore: user.volunteerScore,
            completedPickups: user.completedPickups
          };
        }
      }
    } else {
      const mockUserIndex = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (mockUserIndex !== -1) {
        userFound = true;
        const mockUser = mockUsers[mockUserIndex];
        if (
          mockUser.verificationCode === code &&
          mockUser.verificationExpires &&
          mockUser.verificationExpires > new Date()
        ) {
          codeValid = true;
          mockUser.isVerified = true;
          mockUser.verificationCode = undefined;
          mockUser.verificationExpires = undefined;

          verifiedUserObj = {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            role: mockUser.role,
            contactNumber: mockUser.contactNumber,
            address: mockUser.address,
            gpsLocation: mockUser.gpsLocation,
            ngoCapacity: mockUser.ngoCapacity,
            foodTypePreference: mockUser.foodTypePreference,
            volunteerScore: mockUser.volunteerScore,
            completedPickups: mockUser.completedPickups
          };
        }
      }
    }

    if (!userFound) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    if (!codeValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    const token = generateToken(verifiedUserObj);

    return res.status(200).json({
      success: true,
      message: 'Email address verified successfully',
      token,
      user: verifiedUserObj
    });

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification', error: error.message });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide email address' });
  }

  try {
    const isDb = getDbStatus();
    let userFound = false;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    if (isDb) {
      const dbUser = await User.findOneAndUpdate(
        { email },
        { verificationCode: otp, verificationExpires: expires }
      );
      if (dbUser) userFound = true;
    } else {
      const mockUserIndex = mockUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (mockUserIndex !== -1) {
        mockUsers[mockUserIndex].verificationCode = otp;
        mockUsers[mockUserIndex].verificationExpires = expires;
        userFound = true;
      }
    }

    if (!userFound) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    console.info(`[FoodShare Auth] Verification code resent for: ${email}. Code generated: ${otp}`);

    // Send verification email via Nodemailer
    await sendVerificationEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: 'Verification code resent successfully.'
    });

  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Server error during OTP resend', error: error.message });
  }
};
