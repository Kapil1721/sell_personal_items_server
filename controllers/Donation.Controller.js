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
        amount: amount !== "" ? parseFloat(amount) : 0,
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

    console.log(newDonation, "hjgdhsjfkhjkghd");
    const slug = Date.now() + name.replaceAll(" ", "-");
    const donation = await prisma.donations.create({
      data: {
        name: newDonation.name,
        email: newDonation.email,
        countryCode: newDonation.countryCode,
        phone: newDonation.phone,
        amount: newDonation.amount,
        createdAt: new Date(), // You can also use Prisma's automatic createdAt timestamp
        // Optional: Link to a user (if usersId is provided in your schema)
        usersId: newDonation.userId, // },
        items: {
          create: newDonation.items.map((item) => {
            console.log(item.category);
            return {
              name: item.name,
              userId: newDonation.userId,
              itemsType: "DONATION",
              quantity: parseInt(item.quantity),
              slug: slug,
              categoryId: parseInt(item.category),
              desription: item.description,
              images: {
                create: item.image.map((img, i) => ({
                  fileName: img.fileName,
                  image: img.url,
                })),
              },
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            images: true,
          },
        },
      },
    });
    console.log(donation);
    res.status(200).json({
      donation,
      message: "Congratulation! Your donation has been done successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(404).json({
      error,
      message: "Something went wrong! Please try after some time.",
    });
  }
};
