import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  // console.log(options);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: "noreply@thetestingserver.com",
    to: options.email,
    subject: options.subject,
    text: options.message || null,
    html: options?.html || null,
  };
  // console.log(mailOptions);

  await transporter.sendMail(mailOptions);
};

export default sendEmail;

export const sendMultipleEmails = async (...args) => {
  try {
    const promises = [
      args.forEach((arg, index) => {
        return sendEmail({ ...arg });
      }),
    ];
    console.log(promises, "promises");

    await Promise.all(promises);
  } catch (error) {
    return error;
  }
};
