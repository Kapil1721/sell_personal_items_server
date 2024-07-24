import fs from "fs";
import { CatchAsync } from "../utils/CatchAsync.js";
import prisma from "../utils/prisma.js";
import path from "path";
import sendEmail from "../services/Email.js";

export const subscribeNewsLetter = CatchAsync(async (req, res, next) => {
  const { email } = req.body;

  const _newsletter = await prisma.newsletter.findUnique({ where: { email } });
  if (_newsletter.subscribed) {
    return res.status(200).json({
      status: true,
      message: "You are already subscribed with this email ID",
    });
  }

  const newsLetter = await prisma.newsletter.create({
    data: {
      email: email,
    },
  });
  if (!newsLetter) {
    return res.status(400).json({
      status: false,
      message: "Already subscribed with this email",
    });
  }
  const message = ``;

  const __dirname = path.resolve();

  let x = fs.readFileSync(
    __dirname + "/templates/newsletterconfirmation.html",
    "utf8"
  );

  let y = x
    .replace(
      "{{confirmation_link}}",
      `https://sell-personal-items-server.vercel.app/api/v1/newsletter/confirmation/${newsLetter.id}/${newsLetter.email}`
    )
    .replace(
      "{{unsubscription_link}}",
      `https://sell-personal-items-server.vercel.app/api/v1/newsletter/unsubscribe/${newsLetter.id}/${newsLetter.email}`
    )
    .replace(
      "{{Privacy Policy Link}}",
      `https://sellpersonalitems.thepreview.pro/privacy-policy`
    );

  // console.log("y", y);
  await sendEmail({
    email: email,
    subject: "Newsletter Subscription: Thank you for connecting with us",
    message,
    html: y,
  });
  return res.status(200).json({
    status: true,
    message:
      "Thankyou for subscribing! A comfirmation mail has been sent to your email",
  });
});

export const newsletter_email_verification = CatchAsync(
  async (req, res, next) => {
    const { email, id } = req.params;
    const newsletter = await prisma.newsletter.update({
      where: {
        id: parseInt(id),
        email,
      },
      data: {
        subscribed: true,
      },
    });
    return res.status(200).json({
      status: true,
      message: "Thankyou for subscribing! Your email verification done.",
    });
  }
);
export const newsletter_unsubscribe = CatchAsync(async (req, res, next) => {
  const { email, id } = req.params;
  const newsletter = await prisma.newsletter.update({
    where: {
      id: parseInt(id),
      email,
    },
    data: {
      subscribed: false,
    },
  });
  return res.status(200).json({
    status: true,
    message: "Unsubscribed Successfully",
  });
});
