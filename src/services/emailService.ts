import nodemailer from 'nodemailer';

// Email service for sending password reset emails
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter based on environment
    // For development, use Gmail or a test service
    // For production, use SMTP or service like SendGrid, AWS SES
    
    if (process.env.NODE_ENV === 'production') {
      // Production SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    } else {
      // Development: Use Gmail or Ethereal (test emails)
      // For Gmail, you need to use App Password: https://support.google.com/accounts/answer/185833
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || process.env.GMAIL_USER,
          pass: process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD,
        },
      });
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"EcoTrack India" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'noreply@ecotrack.in'}>`,
      to: email,
      subject: 'Reset Your Password - EcoTrack India',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🌱 EcoTrack India</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Reset Your Password</h2>
            
            <p style="color: #4b5563;">You requested to reset your password for your EcoTrack India account.</p>
            
            <p style="color: #4b5563;">Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #10b981; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated email. Please do not reply to this message.<br>
              © ${new Date().getFullYear()} EcoTrack India. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset Your Password - EcoTrack India
        
        You requested to reset your password. Click the link below to reset it:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send user invitation email (when admin creates account)
   */
  async sendUserInvitation(email: string, name: string, temporaryPassword: string, companyName?: string): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`;
    const companyInfo = companyName ? `<p style="color: #4b5563; margin-top: 10px;"><strong>Company:</strong> ${companyName}</p>` : '';

    const mailOptions = {
      from: `"EcoTrack India" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'noreply@ecotrack.in'}>`,
      to: email,
      subject: 'Welcome to EcoTrack India - Your Account is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to EcoTrack India</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🌱 EcoTrack India</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Welcome, ${name}!</h2>
            
            <p style="color: #4b5563;">Your EcoTrack India account has been created. You can now access your ESG dashboard and start tracking your sustainability metrics.</p>
            ${companyInfo}
            
            <div style="background: #fff; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0;">Your Login Credentials:</p>
              <p style="color: #4b5563; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="color: #4b5563; margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code></p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              <strong>⚠️ Important:</strong> Please change your password after your first login for security.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Login to Dashboard
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you have any questions, please contact our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated email. Please do not reply to this message.<br>
              © ${new Date().getFullYear()} EcoTrack India. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to EcoTrack India!
        
        Your account has been created. Here are your login credentials:
        
        Email: ${email}
        Temporary Password: ${temporaryPassword}
        
        Please change your password after your first login.
        
        Login here: ${loginUrl}
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Invitation email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending invitation email:', error);
      throw new Error('Failed to send invitation email');
    }
  }

  /**
   * Send password reset by admin email
   */
  async sendPasswordResetByAdmin(email: string, name: string, newPassword: string): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`;

    const mailOptions = {
      from: `"EcoTrack India" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'noreply@ecotrack.in'}>`,
      to: email,
      subject: 'Your Password Has Been Reset - EcoTrack India',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🌱 EcoTrack India</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Password Reset</h2>
            
            <p style="color: #4b5563;">Hello ${name},</p>
            
            <p style="color: #4b5563;">Your password has been reset by an administrator. Here is your new temporary password:</p>
            
            <div style="background: #fff; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0;">New Temporary Password:</p>
              <p style="color: #10b981; font-size: 18px; font-weight: 600; margin: 0; font-family: monospace;">${newPassword}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              <strong>⚠️ Important:</strong> Please change your password after logging in for security.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Login Now
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated email. Please do not reply to this message.<br>
              © ${new Date().getFullYear()} EcoTrack India. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset - EcoTrack India
        
        Your password has been reset by an administrator.
        
        New Temporary Password: ${newPassword}
        
        Please change your password after logging in.
        
        Login here: ${loginUrl}
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

