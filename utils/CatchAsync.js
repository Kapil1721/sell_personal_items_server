import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// module.exports = (fn) => {
//   return (req, res, next) => {
//     fn(req, res, next)
//       .catch(next)
//       .finally(async () => {
//         await prisma.$disconnect();
//       });
//   };
// };
export const CatchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next)
      .catch(next)
      .finally(async () => {
        await prisma.$disconnect();
      });
  };
};
