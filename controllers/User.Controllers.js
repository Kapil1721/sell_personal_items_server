import path from "path";
import AppError from "../utils/appError.js";
import fs, { stat } from "fs";
import { PrismaClient } from "@prisma/client";
import { CatchAsync } from "../utils/CatchAsync.js";
import bcrypt from "bcryptjs";
import { count, log } from "console";
import { sendMultipleEmails } from "../services/Email.js";
// import { broadcastService } from "../app.js";

const prisma = new PrismaClient();

const __dirname = path.resolve();

function addMonths(date, months) {
  const newDate = new Date(date); // Copy the original date

  // Set the month and handle cases where days might overflow
  newDate.setMonth(newDate.getMonth() + months);

  // Adjust day if it exceeds the number of days in the new month
  if (newDate.getDate() < date.getDate()) {
    newDate.setDate(0); // Go to the last day of the previous month
  }

  return newDate;
}

const processPayment = async (amount) => {
  try {
    // Integrate with actual payment gateway like Stripe
    // Here, return a mock success response for illustration
    if (!amount) {
      throw new Error("Payment processing failed");
    }
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // amount in cents
    //   currency: 'usd',
    //   payment_method_types: ['card'],
    // });

    return {
      success: true,
      stripePaymentId: "paymentIntent.id",
      currency: "$",
    };
  } catch (error) {
    console.error("Payment processing failed", error);
    return { success: false };
  }
};

const processRefund = async (membershipId, amount) => {
  try {
    // Integrate with your payment gateway to issue a refund
    // Assuming Stripe is used for payment processing
    const refund = await stripe.refunds.create({
      amount: Math.round(amount * 100), // amount in cents
      reason: "requested_by_customer",
      metadata: { membershipId },
    });

    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error("Refund processing failed", error);
    return { success: false };
  }
};

export const addMembership = CatchAsync(async (req, res, next) => {
  const { planId, amount } = req.body;
  const { id } = req.user;
  const existingMembership = await prisma.memberships.findFirst({
    where: { userId: id },
  });

  if (existingMembership) {
    return res.status(400).json({
      status: false,
      message: "User already has an active membership",
    });
  }

  // Step 2: Validate the selected subscription plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return res.status(400).json({
      status: false,
      message: "Invalid subscription plan",
    });
  }

  // Step 3: Process the payment
  const paymentResult = await processPayment(amount);

  if (!paymentResult.success) {
    return res.status(400).json({
      status: false,
      message: "Payment processing failed",
    });
  }

  // Step 4: Calculate start and end dates for the membership
  const startDate = new Date();
  const endDate = addMonths(startDate, plan.duration);

  // Step 5: Create the membership record after successful payment
  const newMembership = await prisma.memberships.create({
    data: {
      startDate,
      endDate,
      userId: id,
      subscriptionPlanId: planId,
      status: "ACTIVE",
    },
  });

  // Step 6: Record the payment in the database
  await prisma.payment.create({
    data: {
      amount,
      currency: paymentResult.currency,
      paymentDate: new Date(),
      stripePaymentId: paymentResult.stripePaymentId,
      subscriptionId:newMembership.id,
      // subscriptionId: newMembership.id,
    },
  });

  // Step 7: Update user status to subscribed
  await prisma.users.update({
    where: { id },
    data: {
      isSubscribed: true,
    },
  });

  // Step 8: Send a confirmation email to the user
  await sendMultipleEmails({
    email: req.user.email,
    subject: "Subscription Activated",
    html: `<p>Your subscription plan has been successfully activated.</p>`,
  });

  // Step 9: Return a success response to the client
  return res.status(201).json({
    status: true,
    message: "Congradulations, Your plan has been activated successfully.",
    isSubscribed: true,
  });
});

export const cancelPlan = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  // const session = await prisma.$transaction();

  const membership = await prisma.memberships.findUnique({
    where: { userId: id },
    include: {
      subscriptionPlan: true,
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError("No active membership found", 400);
  }

  const today = new Date();
  const daysRemaining = differenceInDays(membership.endDate, today);

  if (daysRemaining <= 0) {
    throw new AppError("No days remaining for refund", 400);
  }

  // Calculate the refund amount based on remaining days
  const totalDays = differenceInDays(membership.endDate, membership.startDate);
  const dailyRate = membership.subscriptionPlan.price / totalDays;
  const refundAmount = dailyRate * daysRemaining;

  // Process refund
  const refundResult = await processRefund(membership.id, refundAmount);

  if (!refundResult.success) {
    throw new AppError("Refund processing failed", 500);
  }

  // Update membership status
  const updatedMembership = await prisma.memberships.update({
    where: { id: membership.id },
    data: {
      status: "CANCELLED",
    },
  });

  // Send confirmation emails
  await sendMultipleEmails({
    email: req.user.email,
    subject: "Subscription Cancelled and Refunded",
    html: `<p>Your subscription has been cancelled. A refund of $${refundAmount.toFixed(
      2
    )} has been processed for the remaining days.</p>`,
  });

  // await session.commit();

  return res.status(200).json({
    status: true,
    message: "Subscription cancelled and refund processed successfully",
  });
});

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

  console.log(category);
  const slug = Date.now() + name.replaceAll(" ", "-").replaceAll("/", "-");
  const product = await prisma.listedItem.create({
    data: {
      name,
      desription: description,
      categoryId: category,
      slug,
      userId: req.user.id,
      images: {
        create: [...images, ..._attachments].map((itm) => ({
          imagesType: itm.type,
          image: itm.url,
        })),
      },
    },
    include: {
      images: true,
    },
  });

  // if (product) {
  //   const newImages = [...images, ..._attachments].map((itm) => ({
  //     imagesType: itm.type,
  //     image: itm.url,
  //     listedItem_id: product.post_id,
  //   }));

  //   const productImages = await prisma.images.createMany({
  //     data: [...newImages],
  //   });
  // console.log(product);
  res
    .status(200)
    .json({ status: true, message: "Product is listed successfully." });
  // }
  // } catch (error) {}
});

export const updateProduct = CatchAsync(async (req, res, next) => {
  // try {
  const { name, description, category, images, _attachments, post_id } =
    req.body;
  const slug = Date.now() + name.replaceAll(" ", "-").replaceAll("/", "-");
  // console.log(post_id, "post_id");
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
  console.log(category, "category");
  // const slug = Date.now() + name.replaceAll(" ", "-");
  const product = await prisma.listedItem.update({
    where: {
      post_id: post_id,
    },
    data: {
      name,
      desription: description,
      categoryId: category.id,
      userId: req.user.id,
      updatedAt: new Date(),
      slug,
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
        category: true,
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

  // const product = await prisma.listedItem.findUnique({
  //   where: {
  //     post_id: parseInt(id),
  //   },
  //   include: {
  //     images: true,
  //     comments: true,
  //     views: true,
  //     likes: true,
  //     Donations: true,
  //   },
  // });

  // console.log(product);

  const product = await prisma.listedItem.delete({
    where: {
      post_id: parseInt(id),
    },
    include: {
      images: true,
      comments: true,
      views: true,
      likes: true,
      Donations: true,
    },
  });
  if (!product) {
    return res.status(404).json({
      status: false,
      message: "Product not found",
    });
  }
  // products.images.forEach((image) => {
  //   const file = image.image;
  //   const imagePath = path.join(__dirname, "uploads", file);
  //   if (fs.existsSync(imagePath)) {
  //     // Delete the file
  //     fs.unlinkSync(imagePath);
  //   }
  // });

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
        include: {
          images: true,
          category: true,
          user: true,
        },
      });
      res.status(200).json({
        status: true,
        product,
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
        include: {
          images: true,
          category: true,
          user: true,
        },
      });
      res.status(200).json({
        status: true,
        product,
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
        include: {
          images: true,
          category: true,
          user: true,
        },
      });
      res.status(200).json({
        status: true,
        product,
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
        include: {
          images: true,
          category: true,
          user: true,
        },
      });
      res.status(200).json({
        status: true,
        product,
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
      _count: { select: { views: true, likes: true, comments: true } },
      images: {
        select: {
          image: true,
        },
      },
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
  const { id } = req.user;

  const _user = await prisma.users.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (_user.role === "ADMIN") {
    return res.status(403).json({
      status: false,
      message: "You can't delete admin account",
    });
  }

  const user = await prisma.users.delete({
    where: {
      id: parseInt(id),
      role: "USER",
    },
    include: {
      donations: true,
      socailLinks: true,
      listedItem: true,
    },
  });
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }
  return res.status(200).json({
    status: true,
    message: "Your profile deleted successfully",
  });
});

export const getProfile = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  let user = await prisma.users.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      donations: true,
      socailLinks: true,
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
    user: { ...user, password: undefined, verification: undefined },
  });
});

export const updateSocialMedia = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { socialMedia } = req.body;
  const user = await prisma.users.findUnique({
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

  const deletedLinks = await prisma.socialLinks.deleteMany({
    where: {
      usersId: parseInt(id),
    },
  });

  const newSocialMediaLinks = await prisma.socialLinks.createMany({
    data: socialMedia.map((item) => {
      return {
        usersId: parseInt(id),
        linkName: item.label,
        socialLink: item.link,
      };
    }),
  });
  return res.status(200).json({
    status: true,
    message: "Data saved successfully",
    newSocialMediaLinks,
  });
});

export const upadatePassword = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { oldPassword, newPassword } = req.body;

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
  console.log(passwordMatch, oldPassword, user.password);
  if (!passwordMatch) {
    // res.clearCookie("token");
    return res.status(400).json({ message: "Invalid Password" });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  log(hashedPassword);
  let newUser = await prisma.users.update({
    where: {
      id: parseInt(id),
    },
    data: {
      password: hashedPassword,
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
  const { id } = req.user;
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

  const checkAlreadyExists = await prisma.users.findUnique({
    where: {
      email: newEmail,
    },
  });
  if (checkAlreadyExists) {
    return res
      .status(400)
      .json({ status: false, message: "Email already exists" });
  }

  let newUser = await prisma.users.update({
    where: {
      id: parseInt(id),
    },
    data: {
      email: newEmail,
    },
  });
  newUser.password = undefined;
  newUser.verification = undefined;

  return res.status(200).json({
    status: true,
    message: "Email updated successfully",
    currentEmail: newUser.email,
  });
});

export const updateProfileImage = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  const { image } = req.body;
  const user = await prisma.users.findUnique({
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
      profileImage: image,
    },
  });
  if (!newUser) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }
  res.status(200).json({
    status: true,
    message: "Profile image updated successfully",
    user: { ...newUser, password: undefined, verification: undefined },
  });
});

export const updateAccountDetails = CatchAsync(async (req, res, next) => {
  const { id } = req.user;
  const {
    name,
    userType,
    countryCode,
    contactNumber,
    whatsApp,
    viber,
    profileDescription,
    address,
    buyer,
    seller,
    donor,
  } = req.body;
  const user = await prisma.users.findUnique({
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
      name,
      userType,
      countryCode,
      contactNumber,
      whatsApp,
      viber,
      profileDescription,
      address,
      updatedAt: new Date(),
      buyer,
      seller,
      donor,
    },
    select: {
      id: true,
      username: true,
      email: true,
      contactNumber: true,
      password: true,
      role: true,
      userType: true,
      active: true,
      buyer: true,
      seller: true,
      donor: true,
    },
  });

  res.status(200).json({
    status: true,
    message: "Account details updated successfully",
    user: { ...newUser, password: undefined, verification: undefined },
  });
});

// export const getOnlineOfflineStatus = CatchAsync(async (req, res, next) => {
//   const user = await prisma.users.update({
//     where: {
//       id: req.user.id,
//     },
//     select: {
//       id: true,
//       username: true,
//       online: true,
//     },
//   });
//   broadcastService.broadcast(user);
//   return res.status(200).json({
//     status: true,
//     data: user,
//   });
// });
