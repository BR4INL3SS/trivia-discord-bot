import {
  SlashCommandBuilder,
  userMention
} from '@discordjs/builders';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import {
  CacheType,
  CommandInteraction,
  CommandInteractionOptionResolver,
  MessageEmbed,
  MessageReaction,
  User
} from 'discord.js';
import {
  createTriviaGame
} from '../db/triviaGames';
import {
  categories,
  difficulties,
  emojiOptions,
  leaderboardEmojis,
  pointsPreCorrectAnswer
} from '../utils/constants';
import { shuffle } from '../utils/helpers';
// @ts-ignore
import { decode } from 'html-entities';

const getCategory = (id: string) => {
  return Object.keys(categories).filter(
    (e) => categories[e as keyof typeof categories] === parseInt(id)
  )[0];
};

interface ApiQuestions {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

async function allSynchronously<T> (
  resolvables: (() => Promise<T>)[]
): Promise<T[]> {
  const results = [];
  for (const resolvable of resolvables) {
    results.push(await resolvable());
  }
  return results;
}

export const startTrivia = async (
  interaction: CommandInteraction,
  options: Omit<
    CommandInteractionOptionResolver<CacheType>,
    'getMessage' | 'getFocused'
  >
): Promise<any> => {
  try {
    const channel = interaction.channel!;

    const difficulty = options.getString('difficulty', true);
    const category = options.getString('category', true);
    const amount = options.getInteger('questions', true);

    await interaction.reply({
      content: 'You got it boss.',
      ephemeral: true
    });

    const joiningMessage = await channel.send(
      `New (${difficulty}) Trivia launched by ${userMention(
        interaction.user.id
      )} on **${getCategory(
        category
      )}**. React by :raised_hand: to join. (30 seconds) (${amount} questions)`
    );

    await joiningMessage?.react('✋'); // UX purposes

    const filterJoiningReactions = (reaction: MessageReaction, user: User) => {
      return reaction.emoji.name === '✋' && !user.bot;
    };

    const joiningReactions = await joiningMessage?.awaitReactions({
      filter: filterJoiningReactions,
      time: 30000
    });

    if (joiningReactions) {
      const players =
        joiningReactions
          .first()
          ?.users.cache.map((e) => e.id)
          .filter((e) => e !== joiningMessage?.author.id) || [];

      if (players.length < 2) return;

      const joinedMessage = await channel.send(
        `Time is up: Participating players: ${players!.reduce(
          (prev, current) => `${prev} ${userMention(current)}`,
          ''
        )}`
      );

      const { data } = await axios.get('https://opentdb.com/api.php', {
        params: {
          amount,
          category: parseInt(category),
          difficulty,
          type: 'multiple'
        }
      });

      const questions = data.results as ApiQuestions[];

      const triviaGame: Prisma.TriviaGameCreateInput = {
        players: players || [],
        difficulty,
        questions: [],
        scores: players.map((id) => ({ player: id, score: 0 })),
        winner: ''
      };

      const filterGameReactions = (reaction: MessageReaction, user: User) => {
        return (
          emojiOptions.includes(reaction.emoji.name || '') &&
          !user.bot &&
          players.includes(user.id)
        );
      };

      const questionPromises = questions.map((question, index) => {
        return async () => {
          const shuffledOptions = shuffle(
            question.incorrect_answers.concat(question.correct_answer)
          );

          (triviaGame.questions as Prisma.QuestionCreateInput[]).push({
            question: question.question,
            correctAnswer: question.correct_answer,
            options: shuffledOptions
          });
          const options: Record<string, string> = {};

          emojiOptions.forEach((emoji, index) => {
            options[shuffledOptions[index]] = emoji;
          });

          const embedMessage = new MessageEmbed()
            .setTitle(decode(question.question))
            .setDescription(`Question ${(index + 1).toString()}: (15 seconds)`)
            .addFields(
              ...Object.keys(options).map((option) => ({
                name: `${options[option]} --> **${decode(option)}**`,
                value:
                  '----------------------------------------------------\n\n'
              }))
            );

          const message = await channel.send({ embeds: [embedMessage] });
          await Promise.all(
            emojiOptions.map(async (emoji) => await message.react(emoji))
          );

          const questionReactions = await message.awaitReactions({
            filter: filterGameReactions,
            time: 15000
          });

          let winnersIds: string[] = [];
          if (
            questionReactions.filter(
              (e) => e.emoji.name === options[question.correct_answer]
            ).size
          ) {
            winnersIds = [
              ...[
                ...questionReactions
                  .filter(
                    (e) => e.emoji.name === options[question.correct_answer]
                  )
                  .values()
              ][0].users.cache.values()
            ]
              .map((e) => e.id)
              .filter((e) => e !== joiningMessage.author.id);
          }

          let messageSent;

          if (winnersIds.length) {
            (triviaGame.scores as Prisma.ScoreCreateInput[]).forEach(
              (score) => {
                if (winnersIds.includes(score.player)) {
                  score.score! += pointsPreCorrectAnswer;
                }
              }
            );

            messageSent = await channel.send(
              `Time is up: Correct answer was ${decode(
                question.correct_answer
              )}. ${winnersIds.length} ${
                winnersIds.length > 1 ? 'players' : 'player'
              } got it right! Congrats: ${winnersIds!.reduce(
                (prev, current) => `${prev} ${userMention(current)}`,
                ''
              )}. +100 points :partying_face::partying_face::partying_face:`
            );
          } else {
            messageSent = await channel.send(
              `Hmm... Seems like no one got this one right! Correct answer was : ${decode(
                question.correct_answer
              )}`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

          await messageSent.delete();
          await message.delete();
        };
      });

      await allSynchronously(questionPromises);

      // Calculating the winner
      const leaderboard = (triviaGame.scores as Prisma.ScoreCreateInput[]).sort(
        function (a, b) {
          return b.score! - a.score!;
        }
      );

      triviaGame.winner = leaderboard[0].player;

      await channel.send('This was it for this trivia! And the winner is: ...');

      const winningEmbed = new MessageEmbed()
        .setTitle('We got ourselves a winner :chicken::chicken::chicken:')
        .setDescription(
          `${leaderboardEmojis[0]} ${userMention(triviaGame.winner)} -- ${
            leaderboard[0].score! / 100
          } answered / ${amount} questions`
        )
        .setImage(
          'https://c.tenor.com/JhQnqeXuaMoAAAAC/congrats-leonardo-dicaprio.gif'
        )
        .addFields(
          ...leaderboard
            .slice(1, 3)
            .map((e, index) => ({
              name: '----------------------',
              value: `${leaderboardEmojis[index + 1]} ${userMention(
                e.player
              )} -- ${leaderboard[index + 1].score! / 100}/${amount}`
            }))
        );

      await channel.send({ embeds: [winningEmbed] });

      await joiningMessage.delete();
      await joinedMessage.delete();

      await createTriviaGame(triviaGame);
    }
  } catch (err) {
    console.error('Something went wrong!');
    console.error(err);
    return await interaction.followUp({
      content: 'Something went wrong!',
      ephemeral: true
    });
  }
};

interface Choice {
  name: string;
  value: string;
}

const getDifficulties = (): Choice[] => {
  return Object.keys(difficulties).map((e) => {
    return {
      name: e,
      value: difficulties[e as keyof typeof difficulties]
    };
  });
};

const getCategories = (): Choice[] => {
  return Object.keys(categories).map((cat) => {
    return {
      name: cat,
      value: (categories[cat as keyof typeof categories] || 0).toString()
    };
  });
};

export default new SlashCommandBuilder()
  .setName('trivia')
  .setDescription('Start a trivia game right now')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('Select your Trivia category')
      .setRequired(true)
      .addChoices(...getCategories())
  )
  .addStringOption((option) =>
    option
      .setName('difficulty')
      .setDescription('Select the trivia difficulty')
      .setRequired(true)
      .addChoices(...getDifficulties())
  )
  .addIntegerOption((option) =>
    option
      .setName('questions')
      .setDescription('Number of questions')
      .setRequired(true)
      .setMaxValue(30)
      .setMinValue(1)
  );
