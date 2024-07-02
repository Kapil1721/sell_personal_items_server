import { PrismaClient } from "@prisma/client";
import AppError from "../utils/appError.js";

const prisma = new PrismaClient();

export const getPlans = async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        active: true,
      },
      include: {
        features: true,
      },
    });
    res.status(200).json({ plans });
  } catch (error) {
    return next(error);
  }
};
