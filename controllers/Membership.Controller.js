import { PrismaClient } from "@prisma/client";
import AppError from "../utils/appError.js";

const prisma = new PrismaClient();

export const getPlans = async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        active: true,
      },
      include: {
        features: {
          include: {
            feature: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });
    res.status(200).json({ plans });
  } catch (error) {
    return next(error);
  }
};
export const getPlansById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plans = await prisma.subscriptionPlan.findUnique({
      where: {
        active: true,
        id: parseInt(id),
      },
      include: {
        features: {
          include: {
            feature: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });
    res.status(200).json({ plans });
  } catch (error) {
    return next(error);
  }
};
