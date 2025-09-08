// battle.js written by justian

import { getOrCreatePlayer } from "../../db.js";
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ActionRowBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("battle")
    .setDescription("Battle an opponent for their card")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User you would like to battle")
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");

    function randomCard(arr) {
      const index = Math.floor(Math.random() * arr.length);
      return arr[index];
    }

    const player = getOrCreatePlayer(interaction.user.id);
    const player2 = getOrCreatePlayer(targetUser.id);
    const p1Card = randomCard(player.cards);
    const p2Card = randomCard(player2.cards);

    const accept = new ButtonBuilder()
      .setCustomId("accept")
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success);

    const decline = new ButtonBuilder()
      .setCustomId("decline")
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger);

    const battleRow = new ActionRowBuilder().addComponents(accept, decline);

    const battleEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("Battle Challenge")
      .setDescription(
        "Each player has wagered a card... but they’re hidden until the end!"
      )
      .addFields(
        {
          name: `👑${interaction.user.username}`,
          value: `Has wagered a card`,
          inline: true,
        },
        {
          name: `💀${targetUser.username}`,
          value: `Has wagered a card`,
          inline: true,
        }
      )
      .setFooter({
        text: `${targetUser.username} must accept to start the battle.`,
      });

    const gameStatus = {
      players: [
        {
          name: interaction.user.username,
          id: interaction.user.id,
          lives: 3,
          card: p1Card,
          choice: "none",
        },
        {
          name: targetUser.username,
          id: targetUser.id,
          lives: 3,
          card: p2Card,
          choice: "none",
        },
      ],
      turnIndex: 0,
      hasStarted: false,
    };

    function buildBattleEmbed() {
      const currentPlayer = gameStatus.players[gameStatus.turnIndex];

      return new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("Battle In Progress")
        .setDescription("Choose rock, paper, or scissors!")
        .addFields(
          {
            name: `👑${interaction.user.username}`,
            value: "❤️".repeat(gameStatus.players[0].lives) + `\nChoice: ❔`,
            inline: true,
          },
          {
            name: `💀${targetUser.username}`,
            value: "❤️".repeat(gameStatus.players[1].lives) + `\nChoice: ❔`,
            inline: true,
          }
        )
        .setFooter({ text: `It is ${currentPlayer.name}'s turn!` });
    }

    const rock = new ButtonBuilder()
      .setCustomId("rock")
      .setLabel("🪨rock")
      .setStyle(ButtonStyle.Primary);

    const paper = new ButtonBuilder()
      .setCustomId("paper")
      .setLabel("📃paper")
      .setStyle(ButtonStyle.Secondary);

    const scissors = new ButtonBuilder()
      .setCustomId("scissors")
      .setLabel("✂️scissors")
      .setStyle(ButtonStyle.Primary);

    const run = new ButtonBuilder()
      .setCustomId("run")
      .setLabel("🏃‍♂️run")
      .setStyle(ButtonStyle.Secondary);

    const battleButtonRow = new ActionRowBuilder().addComponents(
      rock,
      paper,
      scissors,
      run
    );

    const msg = await interaction.reply({
      content: `🤺 <@${interaction.user.id}> has challenged <@${targetUser.id}> to a battle 🤺`,
      embeds: [battleEmbed],
      components: [battleRow],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => [interaction.user.id, targetUser.id].includes(i.user.id),
      time: 60000,
    });

    collector.on("collect", async (i) => {
      const declinedEmbed = EmbedBuilder.from(battleEmbed)
        .setDescription("❌ Battle Declined")
        .setFields({
          name: `${targetUser.username} has declined the battle`,
          value: `He keeps his card`,
        })
        .setFooter({ text: " " });

      async function rpsLogic() {
        const p1Choice = gameStatus.players[0].choice;
        const p2Choice = gameStatus.players[1].choice;

        if (
          (p1Choice === "rock" && p2Choice === "scissors") ||
          (p1Choice === "paper" && p2Choice === "rock") ||
          (p1Choice === "scissors" && p2Choice === "paper")
        ) {
          gameStatus.players[1].lives -= 1;
        } else if (
          (p2Choice === "rock" && p1Choice === "scissors") ||
          (p2Choice === "paper" && p1Choice === "rock") ||
          (p2Choice === "scissors" && p1Choice === "paper")
        ) {
          gameStatus.players[0].lives -= 1;
        }

        gameStatus.players[0].choice = "none";
        gameStatus.players[1].choice = "none";
        gameStatus.turnIndex = 0;

        await msg.edit({
          embeds: [buildBattleEmbed()],
          components: [battleButtonRow],
        });

        if (gameStatus.players[0].lives <= 0) {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle("🏆 Battle Over")
                .setDescription(
                  `<@${gameStatus.players[1].id}> wins the battle!\n\n**Winnings:**\n<@${gameStatus.players[1].id}> gains ${gameStatus.players[0].card.name} (${gameStatus.players[0].card.type})\n<@${gameStatus.players[0].id}> loses their card.`
                ),
            ],
            components: [],
          });
          collector.stop();
        } else if (gameStatus.players[1].lives <= 0) {
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle("🏆 Battle Over")
                .setDescription(
                  `<@${gameStatus.players[0].id}> wins the battle!\n\n**Winnings:**\n<@${gameStatus.players[0].id}> gains ${gameStatus.players[1].card.name} (${gameStatus.players[1].card.type})\n<@${gameStatus.players[1].id}> loses their card.`
                ),
            ],
            components: [],
          });
          collector.stop();
        }
      }
      // ------------------------------
      // collectors: accept / decline logic
      // ------------------------------

      // 1. not target player
      
      if (!gameStatus.hasStarted) {
        if (i.user.id !== targetUser.id) {
          return i.reply({
            content: "❌ You are not the challenged player!",
            ephemeral: true,
          });
        }

        // 2. target player declines

        if (i.customId === "decline") {
          return await i.update({
            content: `❌ <@${targetUser.id}> has declined the battle`,
            embeds: [declinedEmbed],
            components: [],
          });
        }

        // 3. target player accepts
        
        if (i.customId === "accept") {
          gameStatus.hasStarted = true;

          return await i.update({
            content: `✅ <@${targetUser.id}> has accepted the battle!`,
            embeds: [buildBattleEmbed()],
            components: [battleButtonRow],
          });
        }
      }

      // ------------------------------
      // collectors: game start logic
      // ------------------------------

      const currentPlayer = gameStatus.players[gameStatus.turnIndex];

      if (gameStatus.hasStarted) {
        if (i.user.id !== currentPlayer.id) {
          return i.reply({
            content: "❌ It's not your turn!",
            ephemeral: true,
          });
        }

        if (i.customId === "run") {
          const otherPlayer = gameStatus.players.find(
            (p) => p.id !== currentPlayer.id
          );

          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle("🏃‍♂️ Player Ran!")
                .setDescription(
                  `<@${currentPlayer.id}> ran away and forfeits their card!\n\n**Winnings:**\n<@${otherPlayer.id}> gains ${currentPlayer.card.name} (${currentPlayer.card.type})\n<@${currentPlayer.id}> loses their card.`
                ),
            ],
            components: [],
          });
          return collector.stop();
        }

        currentPlayer.choice = i.customId;

        await i.reply({
          content: `You pressed ${currentPlayer.choice}`,
          ephemeral: true,
        });

        gameStatus.turnIndex += 1;

        if (gameStatus.turnIndex === 2) {
          await rpsLogic();
        } else {
          await msg.edit({
            embeds: [buildBattleEmbed()],
            components: [battleButtonRow],
          });
        }
      }
    });

    // ------------------------------
    // collectors: time out or forfiet
    // ------------------------------

    collector.on("end", async (_, reason) => {
      try {
        if (!gameStatus.hasStarted) return await msg.edit({ components: [] });

        if (reason === "time") {
          const idleLoser = gameStatus.players[gameStatus.turnIndex];
          const idleWinner = gameStatus.players.find(
            (p) => p.id !== idleLoser.id
          );

          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle("⏰ Battle Timed Out")
                .setDescription(
                  `<@${idleLoser.id}> took too long and forfeited!\n\n**Winnings:**\n<@${idleWinner.id}> gains ${idleLoser.card.name} (${idleLoser.card.type})\n<@${idleLoser.id}> loses their card.`
                ),
            ],
            components: [],
          });
        } else {
          await msg.edit({ components: [] });
        }
      } catch {}
    });
  },
};
