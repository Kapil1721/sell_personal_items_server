import crypto from "crypto";
import jwt from "jsonwebtoken";
import sendMail from "../services/Email.js";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { CatchAsync } from "../utils/CatchAsync.js";
import AppError from "../utils/appError.js";

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
    httpOnly: false,
    sameSite: "none",
    maxAge: 24 * 3600000, // 1 day in milliseconds
    secure: process.env.NODE_ENV === "production", // Only set secure cookie in production
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

    // const message = ``;

    // const __dirname = path.resolve();

    // let x = fs.readFileSync(__dirname + "../templates/accountRegister.html", "utf8");

    // let y = x
    //   .replace("{{name}}", req.body.name)
    //   .replace(
    //     "{{link}}",
    //     `https://reviewsix.vercel.app/api/v1/u-verify/${varificationToken}/${user.id}`
    //   );
    // await sendMail({
    //   email: req.body.email,
    //   subject: "Email Verification: Thank you for registering with us",
    //   message,
    //   html: y,
    // });
    // createSendToken({ userId: user.id, email: user.email }, 201, res);
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

export const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  // console.log(token);
  if (!token) {
    return res.status(403).json({ status: "404" });
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
  res.clearCookie("_session");
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
