import path from "path";
import AppError from "../utils/appError.js";
import fs, { stat } from "fs";
import { PrismaClient } from "@prisma/client";
import { CatchAsync } from "../utils/CatchAsync.js";
import bcrypt from "bcryptjs";
import { count } from "console";

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
    console.log(file);
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
    },
  });

  if (product) {
    const newImages = [...images, ..._attachments].map((itm) => ({
      imagesType: itm.type,
      image: itm.url,
      listedItem_id: product.post_id,
    }));

    const productImages = await prisma.images.createMany({
      data: [...newImages],
    });
    console.log(product, productImages);
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
      updatedAt: new Date(),
    },
  });

  if (product) {
    const newImages = [...images, ..._attachments].map((itm) => ({
      imagesType: itm.type,
      image: itm.url,
      listedItem_id: product.post_id,
    }));
    const oldImages = await prisma.images.deleteMany({
      where: {
        listedItem_id: product.post_id,
      },
    });
    const newImagesData = await prisma.images.createMany({
      data: newImages,
    });
    res.status(200).json({
      status: true,
      message: "Product has been updated successfully.",
    });
  }
  // } catch (error) {}
});

export const getModerationProductsforAdmin = CatchAsync(
  async (req, res, next) => {
    const { page, limit, sort, searchQuery } = req.query;
    const order = sort ? (sort === "Oldest" ? "asc" : "desc") : "desc";

    const products = await prisma.listedItem.findMany({
      where: {
        name: { contains: searchQuery, mode: "insensitive" },
      },
      include: {
        images: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: order,
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
        comments: true,
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
  const { page, limit, sort, searchQuery } = req.query;
  const order = sort ? (sort === "Oldest" ? "asc" : "desc") : "desc";

  const products = await prisma.listedItem.findMany({
    where: {
      userId: id,
      name: { contains: searchQuery, mode: "insensitive" },
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

export const getMyProduct = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  const product = await prisma.listedItem.findUnique({
    where: {
      post_id: parseInt(req.params.id.split("-")[0]),
      userId: id,
    },
    include: {
      images: true,
      comments: true,
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
  });
  const views = await prisma.views.create({
    data: {
      postId: parseInt(req.params.id.split("-")[0]),
      userId: id,
    },
  });
  res.status(200).json({
    status: true,
    product,
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

//profile
export const deleteUser = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await prisma.users.delete({
    where: {
      id: parseInt(id),
    },
    include: {
      images: true,
      donations: true,
      socailLinks: true,
      listedItem: true,
      membership: true,
    },
  });
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }
  user.images.forEach((image) => {
    const file = image.image;
    const imagePath = path.join(__dirname, "uploads", file);
    if (fs.existsSync(imagePath)) {
      // Delete the file
      fs.unlinkSync(imagePath);
    }
  });
  res.status(200).json({
    status: true,
    message: "User deleted successfully",
  });
});

export const getProfile = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await prisma.users.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      donations: true,
      socailLinks: true,
      listedItem: true,
      membership: true,
    },
  });
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }
  res.status(200).json({
    status: true,
    message: "User found successfully",
    user: user,
  });
});

export const updateSocialMedia = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { socialMedia } = req.body;
  const user = await prisma.users.update({
    where: {
      id: parseInt(id),
    },
    data: {
      socailLinks: socialMedia,
    },
    include: {
      socailLinks: true,
    },
  });
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }
  res.status(200).json({
    status: true,
    message: "Data saved successfully",
    user: user,
  });
});

export const upadatePassword = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { oldPassword, newPassord } = req.body;

  const user = await prisma.users.findUnique({
    select: {
      id: true,
      password: true,
    },
    where: {
      id: parseInt(id),
    },
  });

  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }

  const passwordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!passwordMatch) {
    // res.clearCookie("token");
    return res.status(404).json({ message: "Invalid Password" });
  }

  let newUser = await prisma.users.update({
    where: {
      id: parseInt(id),
    },
    data: {
      password: newPassord,
    },
  });

  newUser.password = undefined;

  res.status(200).json({
    status: true,
    message: "Password updated successfully",
    user: newUser,
  });
});

export const upadateEmail = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { currentEmail, newEmail } = req.body;

  const user = await prisma.users.findUnique({
    select: {
      id: true,
      email: true,
    },
    where: {
      id: parseInt(id),
    },
  });

  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }

  if (currentEmail != user.email) {
    // res.clearCookie("token");
    return res.status(404).json({ message: "Invalid email address" });
  }

  let newUser = await prisma.users.update({
    where: {
      id: parseInt(id),
    },
    data: {
      email: newEmail,
    },
  });
  newUser.password === undefined;

  res.status(200).json({
    status: true,
    message: "Password updated successfully",
    user: newUser,
  });
});

export const updateProfileImage = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { image } = req.body;
  const user = await prisma.users.findUnique({
    select: {
      id: true,
      image: true,
    },
    where: {
      id: parseInt(id),
    },
  });
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }
  if (!image) {
    return res.status(404).json({
      status: false,
      message: "Image not found",
    });
  }
  let newUser = await prisma.users.update({
    where: {
      id: parseInt(id),
    },
    data: {
      image: image,
    },
  });
  res.status(200).json({
    status: true,
    message: "Profile image updated successfully",
    user: newUser,
  });
});

export const updateAccountDetails = CatchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  const user = await prisma.users.findUnique({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
    where: {
      id: parseInt(id),
    },
  });
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }
  let newUser = await prisma.users.update({
    where: {
      id: parseInt(id),
    },
    data: {
      name: name,
      email: email,
      phone: phone,
    },
  });
  res.status(200).json({
    status: true,
    message: "Account details updated successfully",
    user: newUser,
  });
});
