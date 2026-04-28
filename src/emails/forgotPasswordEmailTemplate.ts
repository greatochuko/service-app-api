export const getForgotPasswordOtpEmailTemplate = (otp: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 40px; background-color: #ffffff; border-radius: 16px; border: 1px solid #eaeaea; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    
    <h1 style="color: #111; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
      Reset your password
    </h1>

    <p style="color: #555; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
      We received a request to reset your password. Use the code below to continue. This code will expire in 10 minutes.
    </p>
    
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; text-align: center; border: 1px dashed #d1d5db;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 700; color: #000; letter-spacing: 0.2em;">
        ${otp}
      </span>
    </div>

    <div style="margin-top: 32px; border-top: 1px solid #eaeaea; padding-top: 20px;">
      <p style="color: #888; font-size: 13px; line-height: 18px; margin: 20px 0 0 0;">
        If you did not request a password reset, you can safely ignore this email. Your account remains secure.
      </p>
    </div>

  </div>
`;
