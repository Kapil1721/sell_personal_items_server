import crypto from "crypto";
import jwt from "jsonwebtoken";
import sendMail from "../services/Email.js";
import fs from "fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { CatchAsync } from "../utils/CatchAsync.js";
import AppError from "../utils/appError.js";
import sendEmail from "../services/Email.js";
import path from "path";

// const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// const JWT_SECRET = process.env.JWT_SECRET;

const prisma = new PrismaClient();

export const signToken = (user) => {
  return jwt.sign({ ...user }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

export const createSendToken = (user, statusCode, res) => {
  const token = signToken(user);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "none",
    maxAge: 24 * 3600000, // 1 day in milliseconds
    secure: true, // Only set secure cookie in production
  });
  return res.status(statusCode).json({
    status: "success",
    token,
    data: {
      ...user,
    },
  });
};

// export const checkSession = CatchAsync(async (req, res, next) => {
//   if (!req.cookies.token) return res.status(200).json({ status: false });
//   res.status(200).json({ status: "success" });
// });

export const userSignUp = CatchAsync(async (req, res, next) => {
  try {
    const verificationToken = crypto.randomBytes(24).toString("hex");
    const {
      username,
      name,
      email,
      password,
      countryCode,
      contactNumber,
      userType,
      seller,
      buyer,
      donor,
    } = req.body;

    if (!password) {
      return next(new AppError("Please enter a password", 400));
    }

    const findUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    console.log(findUser, "hfggfg");

    if (findUser) {
      return res.status(403).json({ message: "user already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = {
      username: username.toLowerCase(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      countryCode,
      contactNumber,
      userType,
      verification: verificationToken,
      seller,
      buyer,
      donor,
    };

    const user = await prisma.users.create({ data: newUser });
    createSendToken({ userId: user.id, email: user.email }, 201, res);

    const message = ``;

    const __dirname = path.resolve();

    let x = await fs.readFileSync(
      __dirname + "/templates/emailTemp.html",
      "utf8"
    );

    let y = x
      .replace("{{name}}", user.username)
      .replace(
        "{{link}}",
        `https://sell-personal-items-server.vercel.app/api/v1/u-verify/${verificationToken}/${user.id}`
      )
      .replace("{{email}}", req.email)
      .replace("{{password}}", req.password);
    await sendMail({
      email: req.body.email,
      subject: "Email Verification: Thank you for registering with us",
      message,
      html: y,
    });
    createSendToken({ userId: user.id, email: user.email }, 201, res);
  } catch (error) {
    console.log(error);
    return next(new AppError("Something went wrong. Try again later!"), 500);
  }
});

export const userLogin = CatchAsync(async (req, res, next) => {
  const { usernameoremail, password, accountType } = req.body;

  const checkAccountPermission =
    accountType === "DONOR"
      ? { donor: true, buyer: true }
      : accountType === "SELLER"
      ? { seller: true, buyer: true }
      : { buyer: true };

  if (!usernameoremail || !password) {
    return next(
      new AppError("Please provide username/email and password", 400)
    );
  }
  // const user = await prisma.users.findFirst({
  //   where: {
  //     OR: [
  //       { [email.toLowerCase()]: usernameoremail },
  //       { [username.toLowerCase()]: usernameoremail },
  //     ],
  //   },
  // });

  const user = await prisma.users.findFirst({
    select: {
      id: true,
      username: true,
      email: true,
      contactNumber: true,
      password: true,
      role: true,
      userType: true,
      active: true,
      isSubscribed: true,
      ...checkAccountPermission,
    },
    where: {
      OR: [{ email: usernameoremail }, { username: usernameoremail }],
      ...checkAccountPermission,
    },
  });

  console.log(user, checkAccountPermission);
  // If user not found, return error
  if (!user) {
    res.clearCookie("token");
    return res.status(403).json({ message: "Invalid credentials" });
  }
  if (user.role === "ADMIN") {
    res.clearCookie("token");
    return res.status(403).json({ message: "Invalid credentials" });
  }

  // Check if password is correct
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    res.clearCookie("token");
    return res.status(403).json({ message: "Invalid credentials" });
  }

  createSendToken({ ...user, password: undefined }, 200, res);
});

export const verifyUser = CatchAsync(async (req, res, next) => {
  const { token, id } = req.query;
  const user = prisma.users.update({
    data: {
      verified: true,
    },
    where: {
      id: id,
      verification: token,
    },
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({
    message: "User verification has been completed successfully",
  });
});

export const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  // console.log(token);
  if (!token) {
    return res.status(403).json({ status: false, message: "Session Expired, Please login again" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // console.log(decoded, req.user);
    req.user = decoded; // Attach decoded user data to request object
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        status: "expired",
        message: "Session is expired. Login again",
      });
    } else {
      res
        .status(401)
        .json({ status: "invalid", message: "Token is not valid" });
    }
  }
};

export const getValidUser = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(404).json({
        status: false,
        user: null,
      });
    }

    const isVerified = jwt.verify(token, process.env.JWT_SECRET);

    if (!isVerified) {
      return res.status(401).json({
        status: false,
        message: "unauthorised",
        user: null,
      });
    }

    console.log(isVerified, "jdgfjhg");
    let user = await prisma.users.findUnique({
      where: { id: isVerified.id },
    });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "unauthorised",
        user: null,
      });
    }
    user.password = undefined;
    user.verification = undefined;
    return res.status(200).json({
      status: true,
      user: user,
    });
  } catch (error) {
    if (error) {
      if (
        error.message === "invalid token" ||
        error.name === "JsonWebTokenError"
      ) {
        return res.status(401).json({
          status: 401,
          message: "Unauthorized Access. Please log in again",
        });
      }
      if (
        error.message === "jwt expired" ||
        error.name === "TokenExpiredError"
      ) {
        return res.status(401).json({
          status: 401,
          message: "Session Expired. Please log in again",
        });
      }
    }

    return res.status(500).json({
      message: "Internal Server Error",
      text: "Something went wrong. Try again",
    });
  }
};

export const userLogout = CatchAsync(async (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({
    status: 200,
    message: "Logged out successfully",
  });
});

export const AdminLogin = CatchAsync(async (req, res, next) => {
  const { usernameoremail, password, role } = req.body;

  if (!usernameoremail || !password) {
    return next(
      new AppError("Please provide username/email and password", 400)
    );
  }

  const user = await prisma.users.findFirst({
    select: {
      id: true,
      username: true,
      email: true,
      contactNumber: true,
      password: true,
      role: true,
      userType: true,
      active: true,
      seller: true,
      donor: true,
      buyer: true,
    },
    where: {
      OR: [{ email: usernameoremail }, { username: usernameoremail }],
      role,
    },
  });

  console.log(user, role);
  // If user not found, return error
  if (!user) {
    res.clearCookie("token");
    return res.status(403).json({ message: "Invalid credentials" });
  }

  // Check if password is correct
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    res.clearCookie("token");
    return res.status(403).json({ message: "Invalid credentials" });
  }

  createSendToken({ ...user, password: undefined }, 200, res);
});

export const sendOtp = CatchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide email", 400));
  }

  const user = await prisma.users.findFirst({
    select: {
      id: true,
      username: true,
      email: true,
    },
    where: {
      email,
    },
  });

  console.log(user);
  // If user not found, return error
  if (!user) {
    res.clearCookie("token");
    return res.status(403).json({ message: "Invalid email address" });
  }

  let otp = generateOtp();
  console.log(otp);

  const ot_expiry = signToken({ ...user, otp });
  res.cookie("ot_expiry", ot_expiry, {
    httpOnly: true,
    sameSite: "none",
    maxAge: 300000, // 5 min in milliseconds
    secure: true, // Only set secure cookie in production
  });

  await sendEmail({
    email: email,
    subject: "Forget Password: OTP",
    message: `
  Hi ${user.username},

  You recently requested to forget password otp. Your forget password otp is  ${otp}.
  This password otp is only valid for the next 5 minutes.

  If you did not request a password reset, please ignore this email or reply to let us know.

  Thanks, the [sell personal team] team`,
  });

  res.status(200).json({ status: true, message: "OTP sent successfully" });
});

export const verifyOtp = CatchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const { ot_expiry } = req.cookies;
  if (!ot_expiry) {
    return res.status(404).json({ message: "OTP expired" });
  }

  const decoded_otp = jwt.verify(ot_expiry, process.env.JWT_SECRET);
  console.log(otp, decoded_otp);

  if (otp !== decoded_otp.otp) {
    return res.status(400).json({
      status: false,
      message: "Invalid OTP",
    });
  }

  return res
    .status(200)
    .json({ status: true, message: "OTP verified successfully" });
});

export const changePassword = CatchAsync(async (req, res, next) => {
  const { newPassword, confirmPassword, email } = req.body;
  // const { ot_expiry } = req.cookies;

  if (!newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ status: false, message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      status: false,
      message: "new password and confirm password are not matched",
    });
  }

  // const user = await prisma.users.findFirst({
  //   where: {
  //     email: email,
  //   },
  // });
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const updatedUser = await prisma.users.update({
    where: {
      email: email,
    },
    data: {
      password: hashedPassword,
    },
  });

  if (!updatedUser) {
    return res.status(400).json({
      status: false,
      message: "Something went wrong, Please try after sometime",
    });
  }

  res.clearCookie("ot_expiry");
  return res
    .status(200)
    .json({ status: true, message: "Password changed successfully" });
});

// // just for testing
// export const RefreshToken = CatchAsync(async (req, res) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken)
//     return res.status(401).json({ error: "Refresh token not provided" });

//   try {
//     const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
//     const user = await prisma.users.findUnique({
//       where: { id: payload.userId },
//     });
//     const storedToken = await prisma.refreshToken.findUnique({
//       where: { token: refreshToken },
//     });

//     if (!user || !storedToken) throw new Error("Invalid token");

//     const newAccessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRES_IN,
//     });
//     const newRefreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
//       expiresIn: process.env.JWT_REFRESHTOKEN_EXPIRES_IN,
//     });

//     await prisma.refreshToken.delete({ where: { token: refreshToken } });
//     await prisma.refreshToken.create({
//       data: { token: newRefreshToken, userId: user.id },
//     });

//     res.cookie("refreshToken", newRefreshToken, {
//       httpOnly: true,
//       secure: true,
//       sameSite: "Strict",
//     });
//     res.json({ accessToken: newAccessToken });
//   } catch (error) {
//     return res.status(401).json({ error: "Invalid refresh token" });
//   }
// });

// export const Login = CatchAsync(async (req, res,next) => {
//   const { usernameoremail, password, accountType } = req.body;

//   const checkAccountPermission =
//     accountType === "DONOR"
//       ? { donor: true, buyer: true }
//       : accountType === "SELLER"
//       ? { seller: true, buyer: true }
//       : { buyer: true };

//   if (!usernameoremail || !password) {
//     return next(
//       new AppError("Please provide username/email and password", 400)
//     );
//   }
//   const user = await prisma.users.findFirst({
//     select: {
//       id: true,
//       username: true,
//       email: true,
//       contactNumber: true,
//       password: true,
//       role: true,
//       userType: true,
//       active: true,
//       ...checkAccountPermission,
//     },
//     where: {
//       OR: [{ email: usernameoremail }, { username: usernameoremail }],
//       ...checkAccountPermission,
//     },
//   });
//   if (!user || !(await bcrypt.compare(password, user.password))) {
//     return res.status(401).json({ error: "Invalid email or password" });
//   }

//   const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRES_IN,
//   });
//   const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
//     expiresIn: process.env.JWT_REFRESHTOKEN_EXPIRES_IN,
//   });

//   await prisma.refreshToken.create({
//     data: { token: refreshToken, userId: user.id },
//   });

//   return res.status(200).json({
//     status: "success",
//     token:accessToken,
//     data: {
//       ...user,
//       password:undefined
//     },
//   });
// });

// export const authenticate = CatchAsync((req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader)
//     return res
//       .status(401)
//       .json({ status: false, error: "Authorization header not provided" });

//   const token = authHeader.split(" ")[1];
//   try {
//     const payload = jwt.verify(token, JWT_SECRET);
//     req.userId = payload.userId;
//     next();
//   } catch (error) {
//     return res.status(401).json({ status: false, error: "Invalid token" });
//   }
// });

// app.post('/refresh-token', async (req, res) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) return res.status(401).json({ error: 'Refresh token not provided' });

//   try {
//     const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
//     const user = await prisma.user.findUnique({ where: { id: payload.userId } });
//     const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

//     if (!user || !storedToken) throw new Error('Invalid token');

//     const newAccessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
//     const newRefreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

//     await prisma.refreshToken.delete({ where: { token: refreshToken } });
//     await prisma.refreshToken.create({
//       data: { token: newRefreshToken, userId: user.id },
//     });

//     res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
//     res.json({ accessToken: newAccessToken });
//   } catch (error) {
//     return res.status(401).json({ error: 'Invalid refresh token' });
//   }
// });

const generateOtp = () => {
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
};
