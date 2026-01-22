import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email service for sending password reset emails
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter based on environment
    // For development, use Gmail or a test service
    // For production, use SMTP or service like SendGrid, AWS SES
    
    // Get credentials - support both SMTP_* and GMAIL_* environment variables
    // Also support GMAIL_APP (without _PASSWORD suffix) as alternative
    const emailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const emailPassword = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP || process.env.SMTP_PASSWORD;
    
    // Validate credentials are present
    if (!emailUser || !emailPassword) {
      console.error('❌ Email credentials missing!');
      console.error('   Please set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file');
      console.error('   Or set SMTP_USER and SMTP_PASSWORD');
      console.error(`   Current values: GMAIL_USER=${emailUser ? 'SET' : 'NOT SET'}, GMAIL_APP_PASSWORD=${emailPassword ? 'SET' : 'NOT SET'}`);
      throw new Error('Email credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
    }
    
    console.log(`✅ Email service configured with user: ${emailUser}`);
    
    if (process.env.NODE_ENV === 'production') {
      // Production SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
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
          user: emailUser,
          pass: emailPassword,
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
      from: `"EcoTrack India" <${process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@ecotrack.in'}>`,
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
      from: `"EcoTrack India" <${process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@ecotrack.in'}>`,
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
   * Send client onboarding email with complete company and account details
   */
  async sendClientOnboardingEmail(
    email: string,
    name: string,
    temporaryPassword: string,
    companyName: string,
    industry: string,
    location: string,
    plan: string,
    subscriptionStatus?: string,
    trialEndDate?: Date
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`;
    
    // Plan details
    const planDetails: Record<string, { name: string; price: string; features: string[] }> = {
      starter: {
        name: 'Starter',
        price: '₹1,999/month',
        features: ['Basic ESG tracking', 'Quarterly reports', 'Email support']
      },
      pro: {
        name: 'Pro',
        price: '₹4,999/month',
        features: ['Advanced analytics', 'Monthly reports', 'Priority support', '14-day free trial']
      },
      enterprise: {
        name: 'Enterprise',
        price: 'Custom pricing',
        features: ['Full feature access', 'Custom reports', 'Dedicated support', 'API access']
      }
    };

    const planInfo = planDetails[plan.toLowerCase()] || planDetails.starter;
    const isTrial = subscriptionStatus === 'trial' && trialEndDate;
    const trialInfo = isTrial 
      ? `<p style="color: #059669; margin-top: 10px; font-weight: 600;">🎁 You're on a 14-day free trial! Trial ends: ${trialEndDate.toLocaleDateString()}</p>`
      : '';

    const mailOptions = {
      from: `"EcoTrack India" <${process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@ecotrack.in'}>`,
      to: email,
      subject: `Welcome to EcoTrack India - ${companyName} Account Setup Complete!`,
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
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">ESG Tracking & Sustainability Management</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin-top: 0;">Welcome, ${name}!</h2>
            
            <p style="color: #4b5563;">Your company has been successfully onboarded to EcoTrack India. Your ESG dashboard is ready, and you can start tracking your sustainability metrics right away.</p>
            
            <!-- Company Information Card -->
            <div style="background: #fff; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #111827; margin-top: 0; margin-bottom: 15px; font-size: 16px;">📋 Company Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;"><strong>Company Name:</strong></td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Industry:</strong></td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px;">${industry}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Location:</strong></td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px;">${location}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Plan:</strong></td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px;"><strong style="color: #059669;">${planInfo.name}</strong> - ${planInfo.price}</td>
                </tr>
              </table>
              ${trialInfo}
            </div>
            
            <!-- Plan Features -->
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0; font-size: 14px;">✨ Your Plan Includes:</p>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
                ${planInfo.features.map(feature => `<li style="margin: 5px 0;">${feature}</li>`).join('')}
              </ul>
            </div>
            
            <!-- Login Credentials -->
            <div style="background: #fff; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #111827; font-weight: 600; margin: 0 0 15px 0; font-size: 16px;">🔐 Your Login Credentials</p>
              <table style="width: 100%; border-collapse: collapse; background: #fef3c7; padding: 10px; border-radius: 6px;">
                <tr>
                  <td style="padding: 10px; color: #92400e; font-weight: 600; font-size: 14px;">Email:</td>
                  <td style="padding: 10px; color: #92400e; font-size: 14px; font-family: monospace;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; color: #92400e; font-weight: 600; font-size: 14px;">Temporary Password:</td>
                  <td style="padding: 10px; color: #92400e; font-size: 14px; font-family: monospace; font-weight: 600;">${temporaryPassword}</td>
                </tr>
              </table>
              <p style="color: #92400e; font-size: 13px; margin: 15px 0 0 0; padding: 10px; background: #fef3c7; border-radius: 4px;">
                <strong>⚠️ Security Notice:</strong> Please change your password immediately after your first login.
              </p>
            </div>
            
            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                🚀 Access Your Dashboard
              </a>
            </div>
            
            <!-- Next Steps -->
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0; font-size: 14px;">📝 Next Steps:</p>
              <ol style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
                <li style="margin: 5px 0;">Login to your dashboard using the credentials above</li>
                <li style="margin: 5px 0;">Change your password for security</li>
                <li style="margin: 5px 0;">Start entering your ESG data in the Data Collection section</li>
                <li style="margin: 5px 0;">View your sustainability reports and insights</li>
              </ol>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Need help? Our support team is here for you. Contact us at <a href="mailto:support@ecotrack.in" style="color: #10b981;">support@ecotrack.in</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This is an automated email from EcoTrack India.<br>
              © ${new Date().getFullYear()} EcoTrack India. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to EcoTrack India!
        
        Your company account has been successfully created.
        
        COMPANY INFORMATION:
        - Company Name: ${companyName}
        - Industry: ${industry}
        - Location: ${location}
        - Plan: ${planInfo.name} (${planInfo.price})
        ${isTrial ? `- Trial Period: Ends on ${trialEndDate?.toLocaleDateString()}` : ''}
        
        LOGIN CREDENTIALS:
        Email: ${email}
        Temporary Password: ${temporaryPassword}
        
        IMPORTANT: Please change your password after your first login.
        
        Login here: ${loginUrl}
        
        NEXT STEPS:
        1. Login to your dashboard
        2. Change your password
        3. Start entering your ESG data
        4. View your sustainability reports
        
        Need help? Contact support@ecotrack.in
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Client onboarding email sent to ${email} for ${companyName}`);
    } catch (error) {
      console.error('❌ Error sending client onboarding email:', error);
      throw new Error('Failed to send client onboarding email');
    }
  }

  /**
   * Send password reset by admin email
   */
  async sendPasswordResetByAdmin(
    email: string, 
    name: string, 
    newPassword: string,
    companyInfo?: { name: string; industry?: string; location?: string; plan?: string } | null
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`;
    
    // Company information section (if available)
    const companySection = companyInfo ? `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0; font-size: 14px;">🏢 Your Company Information:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px; width: 35%;"><strong>Company:</strong></td>
            <td style="padding: 5px 0; color: #111827; font-size: 13px;">${companyInfo.name}</td>
          </tr>
          ${companyInfo.industry ? `
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px;"><strong>Industry:</strong></td>
            <td style="padding: 5px 0; color: #111827; font-size: 13px;">${companyInfo.industry}</td>
          </tr>
          ` : ''}
          ${companyInfo.location ? `
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px;"><strong>Location:</strong></td>
            <td style="padding: 5px 0; color: #111827; font-size: 13px;">${companyInfo.location}</td>
          </tr>
          ` : ''}
          ${companyInfo.plan ? `
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px;"><strong>Plan:</strong></td>
            <td style="padding: 5px 0; color: #111827; font-size: 13px;"><strong style="color: #059669;">${companyInfo.plan.toUpperCase()}</strong></td>
          </tr>
          ` : ''}
        </table>
      </div>
    ` : '';

    const mailOptions = {
      from: `"EcoTrack India" <${process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@ecotrack.in'}>`,
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
            
            ${companySection}
            
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

