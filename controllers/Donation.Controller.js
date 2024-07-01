import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const createDonation = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      pickupAddress,
      pickupDate,
      items,
      amount,
      countryCode,
    } = req.body;
    const existingUser = await prisma.users.findFirst({
      where: {
        email: email,
      },
    });

    let newDonation;
    if (existingUser) {
      newDonation = {
        userId: existingUser.id,
        name: name,
        email,
        phone,
        countryCode: countryCode ? countryCode : "+91",
        pickupAddress,
        pickupDate,
        items,
        amount,
      };
    } else {
      newDonation = {
        userId: null,
        name: name,
        email,
        phone,
        countryCode: countryCode ? countryCode : "+91",
        pickupAddress,
        pickupDate,
        items,
        amount: amount !== "" ? parseFloat(amount) : 0,
      };
    }

    console.log(newDonation);

    const donation = await prisma.donations.create({
      data: {
        name: newDonation.name,
        email: newDonation.email,
        countryCode: newDonation.countryCode,
        phone: newDonation.phone,
        items: newDonation.items,
        amount: newDonation.amount,
        createdAt: new Date(), // You can also use Prisma's automatic createdAt timestamp
        // Optional: Link to a user (if usersId is provided in your schema)
        usersId: newDonation.userId, // },
      },
    });
    // console.log(donation, newDonation);
    res.status(200).json({
      message: "Congratulation! Your donation has been done successfully.",
    });
  } catch (error) {
    return res.status(404).json({
      error,
      message: "Something went wrong! Please try after some time.",
    });
  }
};
