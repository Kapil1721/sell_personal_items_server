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
  // const { id } = req.user;
  const { page, limit, sort, type, category } = req.query;
  console.log(type);
  const order = sort ? (sort === "Oldest" ? "asc" : "desc") : "desc";

  // const pageNum = parseInt(page) || 1;
  // const size = parseInt(pageSize) || 10;
  // const sort = sortBy || "createdAt";
  // const order = sortOrder as 'asc' | 'desc' || 'asc';

  // Build the Prisma query object
  let whereClause = {
    status: "Active",
    isApproved: true,
    itemsType: type.toLowerCase() === "sale" ? "SALE" : "DONATION",
  };

  // if (status) {
  //   whereClause.status = status;
  // }

  // if (minPrice && maxPrice) {
  //   whereClause.price = {
  //     gte: parseFloat(minPrice),
  //     lte: parseFloat(maxPrice),
  //   };
  // }

  // if (searchTerm) {
  //   whereClause.name = {
  //     contains: searchTerm,
  //     mode: "insensitive",
  //   };
  // }

  if (category && category.toLowerCase() !== "any") {
    whereClause = { ...whereClause, categoryId: parseInt(category) };
  }

  const products = await prisma.listedItem.findMany({
    where: whereClause,
    include: {
      images: true,
      comments: true,
      views: true,
      likes: true,
      category: true,
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
export const getSingleProduct = CatchAsync(async (req, res) => {
  const { slug } = req.params;

  const product = await prisma.listedItem.findUnique({
    where: {
      slug,
    },
    include: {
      images: true,
      comments: true,
      views: true,
      likes: true,
      category: true,
      user: {
        select: {
          name: true,
          username: true,
          userType: true,
          countryCode: true,
          contactNumber: true,
        },
      },
    },
  });

  if (product) {
    await prisma.views.create({
      data: {
        postId: product.post_id,
        userId: product.userId,
      },
    });
  }

  res.status(200).json({
    status: true,
    product: {
      ...product,
      images: product.images.map((item) => ({ ...item, url: item.image })),
    },
  });
});
