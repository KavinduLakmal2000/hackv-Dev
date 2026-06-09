import { z } from 'zod';

// ── Reusable field rules ──────────────────────────────────────────────────────

const usernameField = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and hyphens');

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ── Schemas ───────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  username: usernameField,
  email:    emailField,
  password: passwordField,
  displayName: z
    .string()
    .trim()
    .max(40, 'Display name too long')
    .optional(),
});

export const loginSchema = z.object({
  email:    emailField,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token:       z.string().min(1, 'Token is required'),
  newPassword: passwordField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     passwordField,
});

// ── Middleware factory ────────────────────────────────────────────────────────
// Usage: router.post('/register', validate(registerSchema), authController.register)

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Replace req.body with the validated + coerced data
  req.body = result.data;
  next();
};
