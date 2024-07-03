import path from "path";
import AppError from "../utils/appError.js";
import fs, { stat } from "fs";
import { PrismaClient } from "@prisma/client";
import { CatchAsync } from "../utils/CatchAsync.js";

const prisma = new PrismaClient();

const __dirname = path.resolve();

export const addMembership = async (req, res, next) => {
  try {
    const { plan, user } = req.body;
    const token = req.cookie;
  } catch (error) {
    return next(
      new AppError("Something went wrong! Please try after sometime.")
    );
  }
};

export const uploads = async (req, res, next) => {
  try {
    const { file } = req;
    // console.log(file);
    res.status(200).json({
      status: "success",
      file,
    });
  } catch (error) {
    return next(
      new AppError("Something went wrong! Please try after sometime.")
    );
  }
};
export const deleteUploads = async (req, res, next) => {
  try {
    const { file } = req.params;
    console.log(file);
    const imagePath = path.join(__dirname, "uploads", file);
    if (fs.existsSync(imagePath)) {
      // Delete the file
      fs.unlinkSync(imagePath);
      res
        .status(200)
        .json({ status: true, message: "File deleted successfully" });
    } else {
      res.status(404).json({ status: false, error: "Image not found" });
    }
  } catch (error) {
    return next(
      new AppError("Something went wrong! Please try after sometime.")
    );
  }
};

export const postProduct = CatchAsync(async (req, res, next) => {
  // try {
  const { name, description, category, images, _attachments, active } =
    req.body;
  const slug = Date.now() + name.replaceAll(" ", "-");
  const product = await prisma.listedItem.create({
    data: {
      name,
      desription: description,
      category,
      slug,
      userId: req.user.id,
      updatedAt: new Date.now(),
    },
  });

  if (product) {
    const newImages = [...images, ..._attachments].map((itm) => ({
      imagesType: itm.type,
      image: itm.url,
      listedItem_id: product.post_id,
    }));
    // console.log(product, newImages);
    const productImages = await prisma.images.createMany({
      data: [...newImages],
    });
    res
      .status(200)
      .json({ status: true, message: "Product is listed successfully." });
  }
  // } catch (error) {}
});

export const updateProduct = CatchAsync(async (req, res, next) => {
  // try {
  const { name, description, category, images, _attachments, post_id } =
    req.body;

  console.log(post_id, "post_id");
  const existingProduct = await prisma.listedItem.findUnique({
    where: {
      post_id: post_id,
    },
  });
  if (!existingProduct) {
    return res
      .status(404)
      .json({ status: false, message: "Product not found" });
  }

  const slug = Date.now() + name.replaceAll(" ", "-");
  const product = await prisma.listedItem.update({
    where: {
      post_id: post_id,
    },
    data: {
      name,
      desription: description,
      category,
      slug,
      userId: req.user.id,
    },
  });

  if (product) {
    const newImages = [...images, ..._attachments].map((itm) => ({
      imagesType: itm.type,
      image: itm.url,
      listedItem_id: product.post_id,
    }));
    // console.log(product, newImages);
    // const oldImages = await prisma.images.findMany({
    //   where: {
    //     listedItem_id: post_id,
    //   },
    // });
    // const _newImages = newImages.filter(
    //   (item) => oldImages.find((itm) => itm.image === item.image)
    // );
    // const productImages = await prisma.images.create({
    //   data: [...newImages],
    // });
    res.status(200).json({
      status: true,
      message: "Product has been updated successfully.",
    });
  }
  // } catch (error) {}
});

export const getModerationProductsforAdmin = CatchAsync(
  async (req, res, next) => {
    const products = await prisma.listedItem.findMany({
      include: {
        images: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
    // const user = await prisma.users.findFirst({
    //   where: {
    //     id: products.userId,
    // })
    res.status(200).json({ status: true, products });
  }
);
export const getModerationProductsforAdminByID = CatchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    const products = await prisma.listedItem.findFirst({
      where: {
        post_id: parseInt(id),
      },
      include: {
        images: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
    // const user = await prisma.users.findFirst({
    //   where: {
    //     id: products.userId,
    // })
    res.status(200).json({
      status: true,
      products: {
        ...products,
        images: products.images.map((item) => ({ ...item, url: item.image })),
      },
    });
  }
);

export const deleteModerateProducts = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const product = await prisma.listedItem.delete({
    where: {
      post_id: parseInt(id),
    },
    include: {
      images: true,
      comments: true,
      views: true,
      likes: true,
    },
  });
  if (!product) {
    return res.status(404).json({
      status: false,
      message: "Product not found",
    });
  }
  products.images.forEach((image) => {
    const file = image.image;
    const imagePath = path.join(__dirname, "uploads", file);
    if (fs.existsSync(imagePath)) {
      // Delete the file
      fs.unlinkSync(imagePath);
    }
  });

  res.status(200).json({
    status: true,
    message: "Product deleted successfully",
  });
});

export const updateModerationProductStatus = CatchAsync(
  async (req, res, next) => {
    const { product_id, status } = req.body;

    if (status === "Approve") {
      const product = await prisma.listedItem.update({
        where: {
          post_id: product_id,
        },
        data: {
          status: "Active",
          isApproved: true,
        },
      });
      res.status(200).json({
        status: true,
        message: `Product is approved successfully.`,
      });
    }

    if (status === "Decline") {
      const product = await prisma.listedItem.update({
        where: {
          post_id: product_id,
        },
        data: {
          status: status,
        },
      });
      res.status(200).json({
        status: true,
        message: `Product is declined successfully.`,
      });
    }
    if (status === "Draft") {
      const product = await prisma.listedItem.update({
        where: {
          post_id: product_id,
        },
        data: {
          status: "Draft",
        },
      });
      res.status(200).json({
        status: true,
        message: `Product is ${
          status === "Draft" ? "moved to draft" : "Approved"
        } successfully.`,
      });
    }
    if (status === "Publish") {
      const product = await prisma.listedItem.update({
        where: {
          post_id: product_id,
        },
        data: {
          status: "Active",
        },
      });
      res.status(200).json({
        status: true,
        message: `Product is published successfully.`,
      });
    }
  }
);

export const getMyProducts = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  const products = await prisma.listedItem.findMany({
    where: {
      userId: id,
    },
    include: {
      images: true,
      comments: true,
      views: true,
      likes: true,
    },
  });

  res.status(200).json({
    status: true,
    products,
  });
});

export const deleteMyProduct = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  console.log(id);
  const products = await prisma.listedItem.delete({
    where: {
      post_id: parseInt(id),
    },
    include: {
      images: true,
      comments: true,
      views: true,
      likes: true,
    },
  });
  if (!products) {
    return res.status(404).json({
      status: false,
      message: "Product not found",
    });
  }

  products.images.forEach((image) => {
    const file = image.image;
    const imagePath = path.join(__dirname, "uploads", file);
    if (fs.existsSync(imagePath)) {
      // Delete the file
      fs.unlinkSync(imagePath);
    }
  });

  res.status(200).json({
    status: true,
    message: "Product deleted successfully",
  });
});
