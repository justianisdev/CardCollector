// catch.js written by justian

import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getOrCreatePlayer, getPlayer, updatePlayer } from "../../db.js";
import { finds } from "../../finds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("catch")
    .setDescription("Collect a new card"),

  async execute(interaction) {
    const player = getPlayer(interaction.user.id);

    // rarity chances
    const rarityChances = [
      { rarity: "common", chance: 75, color: 0xd3d3d3 },
      { rarity: "uncommon", chance: 15, color: 0xe67e22 },
      { rarity: "rare", chance: 7, color: 0xf1c40f },
      { rarity: "epic", chance: 2.5, color: 0x3498db },
      { rarity: "legendary", chance: 0.5, color: 0x9b59b6 },
    ];

    // WILL MAKE CLEANER LATER
    // color lookup
    const rarityChancesColor = {
      common: 0xd3d3d3, // gray
      uncommon: 0xe67e22, // orange
      rare: 0xf1c40f, // yellow
      epic: 0x3498db, // blue
      legendary: 0x9b59b6, // purple
    };

    // picks random rarity
    function pickRandomRarity() {
      const total = rarityChances.reduce((sum, r) => sum + r.chance, 0);
      const roll = Math.random() * total;
      let cummlative = 0;
      for (const i of rarityChances) {
        cummlative += i.chance;
        if (roll < cummlative) {
          return i.rarity;
        }
      }
    }

    // picks random card
    function pickRandomCard() {
      const rarity = pickRandomRarity();
      const rarityColor = rarityChancesColor[rarity];
      const pool = finds[rarity];
      const randomI = Math.floor(Math.random() * pool.length);
      const randomCard = pool[randomI];

      return { card: randomCard, color: rarityColor };
    }

    const { card, color } = pickRandomCard();

    function addToPlayer(player, card) {
      // Check if player already has this card
      const existing = player.cards.find((c) => c.name === card.name);

      if (existing) {
        // If player already has it, increase quantity
        existing.quantity += 1;
      } else {
        // If not, add new card to their collection
        player.cards.push({
          name: card.name,
          type: card.type,
          quantity: 1,
        });
      }
    }

    addToPlayer(player, card);

    // --- Update the player in the database ---
    updatePlayer(player);

    const catchEmbed = new EmbedBuilder()
      .setTitle("🎴 New Find...")
      .addFields({
        name: card.name,
        value: card.type,
      })
      .setColor(color);

    interaction.reply({ embeds: [catchEmbed] });
  },
};
