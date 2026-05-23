export const generateForgotPasswordMailTemplate = (otp: string): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password – Dwth System</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f4f4f4; font-family: 'Inter', Arial, sans-serif; color: #111111; }
    .wrapper { width: 100%; padding: 40px 16px; background-color: #f4f4f4; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%); padding: 36px 40px 28px; text-align: center; position: relative; }
    .header::after { content: ''; display: block; position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 24px solid transparent; border-right: 24px solid transparent; border-top: 18px solid #e74c3c; }
    .logo-text { font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-transform: uppercase; }
    .header-subtitle { margin-top: 6px; font-size: 13px; color: rgba(255,255,255,0.80); letter-spacing: 1px; text-transform: uppercase; }
    .body { padding: 48px 40px 32px; text-align: center; }
    .greeting { font-size: 22px; font-weight: 700; color: #111111; margin-bottom: 12px; }
    .description { font-size: 15px; color: #555555; line-height: 1.7; margin-bottom: 36px; }
    .otp-label { font-size: 12px; font-weight: 600; color: #c0392b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
    .otp-box { display: inline-block; background: #111111; border-radius: 12px; padding: 18px 48px; margin-bottom: 16px; }
    .otp-code { font-size: 42px; font-weight: 900; color: #e74c3c; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; }
    .otp-expiry { font-size: 13px; color: #888888; margin-bottom: 36px; }
    .otp-expiry span { color: #c0392b; font-weight: 700; }
    .divider { border: none; border-top: 1px solid #eeeeee; margin: 0 0 28px; }
    .warning-box { background: #fff5f5; border-left: 4px solid #e74c3c; border-radius: 8px; padding: 14px 18px; text-align: left; margin-bottom: 28px; }
    .warning-box p { font-size: 13px; color: #555555; line-height: 1.6; }
    .warning-box strong { color: #c0392b; }
    .footer { background: #111111; padding: 24px 40px; text-align: center; }
    .footer-brand { font-size: 14px; font-weight: 700; color: #e74c3c; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
    .footer-text { font-size: 12px; color: #888888; line-height: 1.6; }
    .footer-text a { color: #e74c3c; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-text">Dwth System</div>
        <div class="header-subtitle">Password Reset</div>
      </div>
      <div class="body">
        <p class="greeting">Reset Your Password 🔑</p>
        <p class="description">
          We received a request to reset your password on <strong>Dwth System</strong>.<br/>
          Use the code below to proceed. If you did not request this, ignore this email.
        </p>
        <div class="otp-label">Your Reset Code</div>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p class="otp-expiry">This code will expire in <span>5 minutes</span>. Do not share it with anyone.</p>
        <hr class="divider"/>
        <div class="warning-box">
          <p>
            <strong>⚠ Security Notice:</strong> If you did not request a password reset,
            please ignore this email or contact our support team immediately.
          </p>
        </div>
      </div>
      <div class="footer">
        <div class="footer-brand">Dwth System</div>
        <p class="footer-text">
          Need help? Contact us at
          <a href="mailto:admail123xx@gmail.com">admail123xx@gmail.com</a><br/>
          &copy; ${new Date().getFullYear()} Dwth System. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const generateOtpMailTemplate = (otp: string): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OTP Verification – Dwth System</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background-color: #f4f4f4;
      font-family: 'Inter', Arial, sans-serif;
      color: #111111;
    }
    .wrapper {
      width: 100%;
      padding: 40px 16px;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.10);
    }
    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
      padding: 36px 40px 28px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      display: block;
      position: absolute;
      bottom: -18px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 24px solid transparent;
      border-right: 24px solid transparent;
      border-top: 18px solid #e74c3c;
    }
    .logo-text {
      font-size: 28px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .logo-dot {
      color: #ffcccc;
    }
    .header-subtitle {
      margin-top: 6px;
      font-size: 13px;
      color: rgba(255,255,255,0.80);
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    /* ── Body ── */
    .body {
      padding: 48px 40px 32px;
      text-align: center;
    }
    .greeting {
      font-size: 22px;
      font-weight: 700;
      color: #111111;
      margin-bottom: 12px;
    }
    .description {
      font-size: 15px;
      color: #555555;
      line-height: 1.7;
      margin-bottom: 36px;
    }
    /* ── OTP Box ── */
    .otp-label {
      font-size: 12px;
      font-weight: 600;
      color: #c0392b;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }
    .otp-box {
      display: inline-block;
      background: #111111;
      border-radius: 12px;
      padding: 18px 48px;
      margin-bottom: 16px;
    }
    .otp-code {
      font-size: 42px;
      font-weight: 900;
      color: #e74c3c;
      letter-spacing: 10px;
      font-family: 'Courier New', Courier, monospace;
    }
    .otp-expiry {
      font-size: 13px;
      color: #888888;
      margin-bottom: 36px;
    }
    .otp-expiry span {
      color: #c0392b;
      font-weight: 700;
    }
    /* ── Divider ── */
    .divider {
      border: none;
      border-top: 1px solid #eeeeee;
      margin: 0 0 28px;
    }
    /* ── Warning ── */
    .warning-box {
      background: #fff5f5;
      border-left: 4px solid #e74c3c;
      border-radius: 8px;
      padding: 14px 18px;
      text-align: left;
      margin-bottom: 28px;
    }
    .warning-box p {
      font-size: 13px;
      color: #555555;
      line-height: 1.6;
    }
    .warning-box strong {
      color: #c0392b;
    }
    /* ── Footer ── */
    .footer {
      background: #111111;
      padding: 24px 40px;
      text-align: center;
    }
    .footer-brand {
      font-size: 14px;
      font-weight: 700;
      color: #e74c3c;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .footer-text {
      font-size: 12px;
      color: #888888;
      line-height: 1.6;
    }
    .footer-text a {
      color: #e74c3c;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">

      <!-- Header -->
      <div class="header">
        <div class="logo-text">Dwth<span class="logo-dot"> </span>System</div>
        <div class="header-subtitle">Secure Verification</div>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Verify Your Account 🔐</p>
        <p class="description">
          Hello! You requested an OTP to verify your account on <strong>Dwth System</strong>.<br/>
          Use the code below to complete your registration.
        </p>

        <!-- OTP -->
        <div class="otp-label">Your One-Time Password</div>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p class="otp-expiry">This code will expire in <span>5 minutes</span>. Do not share it with anyone.</p>

        <hr class="divider"/>

        <!-- Warning -->
        <div class="warning-box">
          <p>
            <strong>⚠ Security Notice:</strong> If you did not request this OTP,
            please ignore this email or contact our support team immediately.
            Your account security is our top priority.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-brand">Dwth System</div>
        <p class="footer-text">
          Need help? Contact us at
          <a href="mailto:admail123xx@gmail.com">admail123xx@gmail.com</a><br/>
          &copy; ${new Date().getFullYear()} Dwth System. All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
};
