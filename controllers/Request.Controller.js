import prisma from "../utils/prisma.js";

export const sendPurchaseRequest = async (req, res) => {
  const { buyerId, productId } = req.body;

  try {
    const product = await prisma.listedItem.findUnique({
      where: { post_id: productId },
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        buyerId,
        sellerId: product.userId,
        productId,
        status: "Pending",
      },
    });

    return res.status(201).json({
      status: true,
      message: "Your purchase request have been sent successfully",
      data: purchaseRequest,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getPurchaseRequests = async (req, res) => {
  const { userId } = req.params;

  try {
    const purchaseRequests = await prisma.purchaseRequest.findMany({
      where: {
        OR: [{ buyerId: parseInt(userId) }, { sellerId: parseInt(userId) }],
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            name: true,
            post_id: true,
            category: {
              select: {
                name: true,
                id: true,
              },
            },
            images: {
              take: 1,
              select: {
                image: true,
              },
            },
          },
        },
      },
    });

    if (!getPurchaseRequests) {
      return res.status(404).json({
        status: false,
        message: "Purchase Requests not found",
      });
    }

    return res.status(200).json({ success: true, data: purchaseRequests });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
