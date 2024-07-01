import path from "path";
import AppError from "../utils/appError.js";
import fs from "fs";
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
  const { name, description, category, images, _attachments } = req.body;
  const slug = Date.now() + name.replaceAll(" ", "-");
  const product = await prisma.listedItem.create({
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
    const productImages = await prisma.images.createMany({
      data: [...newImages],
    });
    res
      .status(200)
      .json({ status: true, message: "Product is listed successfully." });
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

export const updateModerationProductStatus = CatchAsync(
  async (req, res, next) => {
    const { product_id, status } = req.body;
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
      message: `Product is ${
        status === "Draft" ? "moved to draft" : "Approved"
      } successfully.`,
    });
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
