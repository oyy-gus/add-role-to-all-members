import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import axios from "axios";
import config from "./config.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const queue = [];
const requestInterval = 1000;

async function processQueue(message, role) {
  while (queue.length > 0) {
    const request = queue.shift();
    await request();
    await new Promise(resolve => setTimeout(resolve, requestInterval));
  }

  const embed = new EmbedBuilder()
  .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
  .setDescription(`Role \` "${role.name}" \` berhasil diberikan kepada semua anggota di server ini.`);

  message.channel.send({ embeds: [embed] }).then((messages) => {
    setTimeout(function() {
      messages.delete().catch(console.error());
    }, 6000);
  });
}

client.on("ready", async () => {
  console.log(client.user.tag + " sudah online!");
});

client.on("messageCreate", async (message) => {
  if (!config.admin.includes(message.author.id)) return;

  if (message.content === "!addrole") {
    const guildId = message.guildId;

    const role = message.guild.roles.cache.get(config.roleId);

    if (!role) {
      const embed = new EmbedBuilder()
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setDescription(`Role dengan ID \` "${config.roleId}" \` tidak ditemukan di server ini.`);

      message.channel.send({ embeds: [embed] }).then((messages) => {
        setTimeout(function() {
          messages.delete().catch(console.error());
        }, 6000);
      });
      return;
    }

    const url = `https://discord.com/api/v9/guilds/${guildId}/members?limit=1000`;
    const headers = {
      Authorization: `Bot ${config.token}`
    };

    axios.get(url, {
      headers
    }).then(response => {
      const members = response.data;
      for (const member of members) {
        const memberId = member.user.id;
        queue.push(async function() {
          try {
            await axios.put(`https://discord.com/api/v9/guilds/${guildId}/members/${memberId}/roles/${config.roleId}`, {}, {
              headers
            });

            const embed = new EmbedBuilder()
            .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setDescription(`Role \` "${role.name}" \` telah diberikan kepada  \` @${member.user.username} \``);

            message.channel.send({ embeds: [embed] }).then((messages) => {
              setTimeout(function() {
                messages.delete().catch(console.error);
              }, 6000);
            });
          } catch (error) {
            console.error(`Gagal menambahkan role ke ${member.user.username}:`, error);
          }
        });
      }

      processQueue(message, role);
    }).catch(error => {
      console.error("Gagal mengambil anggota server:", error);

      const embed = new EmbedBuilder()
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setDescription("Terjadi kesalahan saat mencoba mengambil anggota server.");

      message.channel.send({ embeds: [embed] }).then((messages) => {
        setTimeout(function() {
          messages.delete().catch(console.error);
        }, 6000);
      });
    });
  }
});

client.login(config.token);