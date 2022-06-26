import { SlashCommandBuilder, userMention } from "@discordjs/builders";
import { Prisma } from "@prisma/client";
import {
  CacheType,
  CommandInteraction,
  CommandInteractionOptionResolver,
  MessageEmbed,
} from "discord.js";
import { getLeaderboards as getLeaderboardsPrisma } from "../db/triviaGames";
import { leaderboardEmojis } from "../utils/constants";
import { discordClient } from "../utils/discord";

interface LeaderboardAggregation {
  _id: string;
  total: number;
}

export const getLeaderboards = async (interaction: CommandInteraction) => {
  try {
    const leaderboard: any = await getLeaderboardsPrisma();

    await interaction.reply({
      content: "Sure! Give me a sec...",
      ephemeral: true,
    });

    if (!leaderboard.length) {
      return await interaction.followUp({
        content:
          "Seems like you haven't played any game yet! Try playing it and re-try the command 😃"
      });
    }

    await interaction.guild?.members.fetch();

    const winnerAvatarURL = interaction.guild?.members.cache
      .filter((e) => leaderboard[0]._id === e.id)
      .first()
      ?.user?.avatarURL({ size: 256, dynamic: true });

    const leaderboardEmbed = new MessageEmbed()
      .setAuthor({
        name: discordClient.user?.tag.split("#")[0] || "",
        iconURL: discordClient.user?.avatarURL() || "",
      })
      .setTitle("Trivia Leaderboard")
      .addFields(
        ...leaderboard
          .slice(0, 3)
          .map(({ _id, total }: LeaderboardAggregation, index: number) => ({
            name: "-".repeat(75),
            value: `${leaderboardEmojis[index]} goes to --> ${userMention(
              _id
            )} with a total of ${total} game${total > 1 ? "s" : ""} won.`,
          }))
      )
      .setThumbnail(winnerAvatarURL || "")
      .setColor("RED");

    return await interaction.channel?.send({ embeds: [leaderboardEmbed] });
  } catch (error) {
    console.error(`Something went wrong!`);
    console.error(error);
    return await interaction.followUp({
      content: `Something went wrong!`,
      ephemeral: true,
    });
  }
};

export default new SlashCommandBuilder()
  .setName("trivia_leaderboards")
  .setDescription("Get current standing of trivia games");
