// catch.js written by justian

import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getOrCreatePlayer, updatePlayer } from "../../db.js";
import { finds } from "../../finds.js";

// Track cooldowns
const cooldowns = new Map(); // key: userID, value: timestamp of last use
const COOLDOWN = 30 * 1000; // 30 seconds in milliseconds

export default {
  data: new SlashCommandBuilder()
    .setName("catch")
    .setDescription("Collect a new card"),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Check cooldown
    const lastUsed = cooldowns.get(userId);
    const now = Date.now();
    if (lastUsed && now - lastUsed < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (now - lastUsed)) / 1000);
      return interaction.reply({
        content: `⏳ You must wait ${remaining}s before catching another card!`,
        ephemeral: true,
      });
    }

    // Update cooldown
    cooldowns.set(userId, now);

    // Get player
    const player = getOrCreatePlayer(userId);

    // rarity chances
    const rarityChances = [
      { rarity: "common", chance: 75, color: 0xd3d3d3 },
      { rarity: "uncommon", chance: 15, color: 0xe67e22 },
      { rarity: "rare", chance: 7, color: 0xf1c40f },
      { rarity: "epic", chance: 2.5, color: 0x3498db },
      { rarity: "legendary", chance: 0.5, color: 0x9b59b6 },
    ];

    const rarityChancesColor = {
      common: 0xd3d3d3,
      uncommon: 0xe67e22,
      rare: 0xf1c40f,
      epic: 0x3498db,
      legendary: 0x9b59b6,
    };

    // picks random rarity
    function pickRandomRarity() {
      const total = rarityChances.reduce((sum, r) => sum + r.chance, 0);
      const roll = Math.random() * total;
      let cummlative = 0;
      for (const i of rarityChances) {
        cummlative += i.chance;
        if (roll < cummlative) return i.rarity;
      }
    }

    // picks random card
    function pickRandomCard() {
      const rarity = pickRandomRarity();
      const rarityColor = rarityChancesColor[rarity];
      const pool = finds[rarity];
      const randomI = Math.floor(Math.random() * pool.length);
      return { card: pool[randomI], color: rarityColor };
    }

    const { card, color } = pickRandomCard();

    // Add card to player
    function addToPlayer(player, card) {
      const existing = player.cards.find((c) => c.name === card.name);
      if (existing) existing.quantity += 1;
      else
        player.cards.push({
          name: card.name,
          type: card.type,
          quantity: 1,
        });
    }

    addToPlayer(player, card);
    updatePlayer(player);

    const catchEmbed = new EmbedBuilder()
      .setTitle("🎴 New Find...")
      .addFields({ name: card.name, value: card.type })
      .setColor(color);

    interaction.reply({ embeds: [catchEmbed] });
  },
};
