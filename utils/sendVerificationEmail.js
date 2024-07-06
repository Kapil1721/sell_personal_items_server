import nodemailer from 'nodemailer'

// Create a transporter object using SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',  // Your SMTP server host
  port: 587,                 // SMTP port (typically 587 for TLS, 465 for SSL)
  secure: false,             // true for 465, false for other ports
  auth: {
    user: 'your_email@example.com',  // Your email address
    pass: 'your_email_password'      // Your email password (consider using environment variables)
  }
});

// Example function to send verification email
const sendVerificationEmail = (email, token) => {
  const mailOptions = {
    from: 'your_email@example.com',  // Sender email address
    to: email,                       // Recipient email address
    subject: 'Verify Your Email Address',
    text: `Click this link to verify your email: http://localhost:3000/verify/${token}`  // Verification link
    // You can also use HTML instead of text
    // html: `<p>Click <a href="http://localhost:3000/verify/${token}">here</a> to verify your email.</p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

module.exports = sendVerificationEmail;
