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
  const { userId } = req.params;
  console.log(type, userId);
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
  let likesWhereClause = true;
  if (userId) {
    likesWhereClause = {
      where: {
        user_id: parseInt(userId),
      },
      select: {
        like: true,
      },
    };
  }

  const products = await prisma.listedItem.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          likes: {
            where: {
              like: true,
            },
          },
          views: true,
        },
      },
      images: true,
      comments: true,
      likes: likesWhereClause,
      category: true,
    },
    orderBy: {
      createdAt: order,
    },
  });

  if (!products) {
    return res.status(404).json({ message: "No products found." });
  }

  const productsWithLikeStatus = products.map((product) => ({
    ...product,
    likeStatus: product.likes.length > 0 ? product.likes[0].like : false,
  }));

  // if (products) {
  //   const views = await prisma.views.findMany({
  //     where: {
  //       postId: {
  //         in: products.map((item) => item.id),
  //       },
  //     },
  //   });
  //   const likes = await prisma.likes.findMany({
  //     where: {
  //       postId: {
  //         in: products.map((item) => item.id),
  //       },
  //     },
  //   });
  //   const comments = await prisma.comments.findMany({
  //     where: {
  //       postId: {
  //         in: products.map((item) => item.id),
  //       },
  //     },
  //   });
  // }
  return res.status(200).json({
    status: true,
    products: productsWithLikeStatus,
  });
});
export const getFavoriteProducts = CatchAsync(async (req, res) => {
  const userId = req.user.id;
  const products = await prisma.favoriteProductList.findMany({
    where: {
      userId,
    },
    include: {
      products: {
        include: {
          images: true,
          comments: true,
          category: true,
          views: true,
          likes: true,
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
      },
    },
  });
  if (!products) {
    return res.status(404).json({ message: "No products found." });
  }
  // const productsWithLikeStatus = products.map((product) => ({
  //   ...product,
  //   likeStatus: product.likes.length > 0 ? product.likes[0].like : false,
  // }));
  return res.status(200).json({
    status: true,
    products: products,
  });
});

export const getSingleProduct = CatchAsync(async (req, res) => {
  const { slug } = req.params;

  const { userId } = req.params;

  let likesWhereClause = true;
  if (userId) {
    likesWhereClause = {
      where: {
        user_id: parseInt(userId),
      },
      select: {
        like: true,
      },
    };
  }

  const product = await prisma.listedItem.findUnique({
    where: {
      slug,
    },
    include: {
      _count: {
        select: {
          likes: {
            where: {
              like: true,
            },
          },
          views: true,
        },
      },
      images: true,
      comments: true,
      // likes: likesWhereClause,
      category: true,
      user: {
        select: {
          name: true,
          online: true,
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

  return res.status(200).json({
    status: true,
    product: {
      ...product,
      images: product.images?.map((item) => ({ ...item, url: item.image })),
    },
  });
});

export const postLike = CatchAsync(async (req, res) => {
  const { id, like } = req.body;

  const existingLike = await prisma.likes.findFirst({
    where: {
      listedItemPost_id: parseInt(id),
      user_id: parseInt(req.user.id),
    },
  });

  if (existingLike) {
    const updatedLike = await prisma.likes.update({
      where: { id: existingLike.id },
      data: { like },
      select: {
        like: true,
      },
    });
    console.log(updatedLike, "updated");
    return res.status(200).json({ status: true, data: updatedLike });
  } else {
    const newLike = await prisma.likes.create({
      data: {
        listedItemPost_id: parseInt(id),
        user_id: parseInt(req.user.id),
        like,
      },
      select: {
        like: true,
      },
    });
    console.log(newLike, "newly");
    return res.status(200).json({ status: true, data: newLike });
  }
});

export const AddToFavorite = CatchAsync(async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id;
  console.log(id, userId);
  const existingFavorite = await prisma.favoriteProductList.findFirst({
    where: {
      postId: parseInt(id),
      userId: parseInt(userId),
    },
  });
  if (existingFavorite) {
    return res
      .status(200)
      .json({ status: true, message: "This item already present in favorite" });
  } else {
    const newFavorite = await prisma.favoriteProductList.create({
      data: {
        postId: parseInt(id),
        userId: parseInt(userId),
      },
      include: {
        products: true,
      },
    });
    return res.status(200).json({
      status: true,
      data: newFavorite,
      message: "Item added to favorite",
    });
  }
});
export const RemoveFromFavorite = CatchAsync(async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id;
  console.log(id, userId);
  const existingFavorite = await prisma.favoriteProductList.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (!existingFavorite) {
    return res.status(404).json({ status: false, message: "No record found" });
  } else {
    const newFavorite = await prisma.favoriteProductList.delete({
      where: {
        id: parseInt(id),
      },
    });
    return res.status(200).json({
      status: true,
      data: newFavorite,
      message: "Item added to favorite",
    });
  }
});

export const promoteProduct = CatchAsync(async (req, res) => {
  const { postId, planId } = req.body;
  const userId = req.user.id;

  const promotedProducts = await prisma.promotedProduct.create({
    data: {
      postId: parseInt(postId),
      planId: parseInt(planId),
      userId: userId,
    },
  });
  if (!promotedProducts) {
    return res.status(404).json({ status: false, message: "No record found" });
  } else {
    return res.status(200).json({
      status: true,
      data: promotedProducts,
      message: "Promoted Successfully",
    });
  }
});
