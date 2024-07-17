import { CatchAsync } from "../utils/CatchAsync.js";
import prisma from "../utils/prisma.js";

export const getProductCategories = CatchAsync(async (req, res) => {
  const productCategories = await prisma.itemCategories.findMany({
    where: {
        active: true,
    },
  });
  res.status(200).json({
    status: true,
    productCategories,
  });
});

export const getAllProducts = CatchAsync(async (req, res) => {
  const { id } = req.user;
  const { page, limit, sort, searchQuery } = req.query;
  const order = sort ? (sort === "Oldest" ? "asc" : "desc") : "desc";

  const products = await prisma.listedItem.findMany({
    where: {
      status: "Active",
      isApproved: true,
    },
    include: {
      images: true,
      comments: true,
      views: true,
      likes: true,
    },
    orderBy: {
      createdAt: order,
    },
  });

  res.status(200).json({
    status: true,
    products,
  });
});
export const getSingleProduct = CatchAsync(async (req, res) => {});
