import prisma from ".";
import type { TriviaGame, Prisma } from "@prisma/client";

export const getTriviaGames = async () => {
  return await prisma.triviaGame.findMany();
};

export const getTriviaGame = async (id: string) => {
  return await prisma.triviaGame.findUnique({
    where: {
      id,
    },
  });
};

export const deleteTriviaGame = async (id: string) => {
  return await prisma.triviaGame.delete({
    where: {
      id,
    },
  });
};

export const createTriviaGame = async (game: Prisma.TriviaGameCreateInput) => {
  return prisma.triviaGame.create({
    data: game,
  });
};

export const getLeaderboards = async () => {
  const res = await prisma.triviaGame.aggregateRaw({
    pipeline: [
      { $group: { _id: "$winner", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ],
  });
  return res;
};
