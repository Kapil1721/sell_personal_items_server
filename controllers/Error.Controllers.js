import { Prisma } from "@prisma/client";
import AppError from "../utils/appError.js";

const handlePrismaUniqueConstraintError = (err) => {
  const val = err.target.split("_").includes("email")
    ? "email"
    : err.target.split("_")[1];

  const message = `Duplicate field value: ${val}. Please use another value!`;
  return new AppError(message, 400);
};

const handlePrismaValidationError = (err) => {
  const errorMessage = err.message.split("\n").pop();
  const message = `Invalid input data. ${errorMessage}`;
  return new AppError(message, 400);
};

const sendErrorDev = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR 💥", err);

    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR 💥", err);

    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
};

const globalErrorHandlers = async (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  console.log(err);

  if (process.env.NODE_ENV === "development") {
    if (err instanceof Prisma.PrismaClientValidationError) {
      const prismaValidationError = handlePrismaValidationError(err);
      return sendErrorDev(prismaValidationError, res);
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const prismaUniqueConstraintError = handlePrismaUniqueConstraintError(
          err.meta
        );
        return sendErrorDev(prismaUniqueConstraintError, res);
      }
    }

    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = err;

    if (err instanceof Prisma.PrismaClientValidationError) {
      error = handlePrismaValidationError(err);
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        error = handlePrismaUniqueConstraintError(err.meta);
      }
    }

    sendErrorProd(error, res);
  }
};

export default globalErrorHandlers;
