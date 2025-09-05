// collection.js written by justian

import {
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { getOrCreatePlayer, getPlayer } from "../../db.js";

export default {
  data: new SlashCommandBuilder()
    .setName("collection")
    .setDescription("See your card collection")

    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("view a users cards (LEAVE BLANK TO VIEW YOUR OWN)")
        .setRequired(false)
    ),

  async execute(interaction) {
    // defining player and player ID variable
    const userID = interaction.user.id;
    let player;
    let refUsername;
    const targetUser = interaction.options.getUser("user") || interaction.user;
    if (targetUser) {
      player = await getPlayer(targetUser.id);
      refUsername = targetUser.username;
    } else {
      player = getPlayer(userID);
      refUsername = interaction.user.username;
    }

    if (targetUser.bot)
      return interaction.reply({
        content: "❌Bots do not have card inventories!",
        ephemeral: true,
      });
    if (!player) {
      return interaction.reply(
        "❌This person is not in the database! If this is you run **/start**"
      );
    }

    // defining the buttons
    const previous = new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true);

    const next = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("next")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(previous, next);

    // defining table and array where cards will be pushed to
    const rarityTable = [
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
      "bugged",
    ];
    let collected = [];

    // recursive function that displays all cards in users account from common to legendary
    function fields(tableIndex = 0) {
      if (tableIndex >= rarityTable.length) return collected;
      player.cards
        .filter((card) => card.type.startsWith(rarityTable[tableIndex]))
        .forEach((card) => {
          collected.push({
            name: card.name,
            value: `${card.type} x(${card.quantity})`,
            inline: true,
          });
        });
      fields((tableIndex += 1));
    }
    fields();

    // the message response

    let pageNum = 0;
    let start = 0;
    let end = 10;
    const maxPage = Math.ceil(collected.length / 10) - 1;

    const CollectionEmbed = new EmbedBuilder()
      .setColor("FFFFFF")
      .setTitle(`🃏 ${refUsername}'s Collection`)
      .addFields(collected.slice(start, end))
      .setFooter({ text: `Page ${pageNum + 1}/${maxPage + 1}` });

    const msg = await interaction.reply({
      embeds: [CollectionEmbed],
      components: [buttonRow],
      fetchReply: true,
    });

    // adding listeners for changes in button press

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "previous") {
        start -= 10;
        end -= 10;
        pageNum -= 1;
        CollectionEmbed.setFields(collected.slice(start, end));
      }

      if (i.customId === "next") {
        start += 10;
        end += 10;
        pageNum += 1;
        CollectionEmbed.setFields(collected.slice(start, end));
      }

      previous.setDisabled(pageNum == 0);
      next.setDisabled(pageNum >= maxPage);

      CollectionEmbed.setFooter({ text: `Page ${pageNum + 1}/${maxPage + 1}` });
      await i.update({ embeds: [CollectionEmbed], components: [buttonRow] });
    });

    collector.on("end", async (i) => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
