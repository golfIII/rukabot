// Remember, when starting Deno projects, do
// ctrl+shift+p and run the 'deno init workspace' command.

import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Bot } from './global.ts'

// Load all commands
import './command/all.ts'

Discordeno.startBot({
    token: Bot.token,
    intents: ['Guilds', 'GuildMessages', 'DirectMessages', 'GuildMessageReactions',
                'GuildVoiceStates', 'GuildVoiceStates', 'GuildBans'],
    eventHandlers: {
        ready: async () => {

            Bot.musicNode.userId = Discordeno.botId

            await Bot.musicNode.connect(Discordeno.botId)

            Discordeno.editBotStatus({
                status: 'online',
                activities: [{
                    name: `${Bot.prefix}.help`,
                    type: Discordeno.DiscordActivityTypes.Game,
                    createdAt: Date.now(),
                }]
            })

            console.log('online!')
        },

        messageCreate: (msg: Discordeno.DiscordenoMessage) => {
            // Don't respond to self or other bots
            if(msg.isBot)
                return

            // Update message collectors
            Bot.allMessageCollectors.onUpdate(msg)

            // Handle all commands
            for(const command of Bot.globalCommands.commands) {
                Bot.globalCommands.handleCommand(msg, command)
            }
        },

        reactionAdd: (reaction: Discordeno.MessageReactionAdd, _msg?: Discordeno.DiscordenoMessage | undefined) => {
            // Update reaction collectors
            Bot.allReactionCollectors.onUpdate(reaction)

        },

        voiceServerUpdate: (payload: Discordeno.VoiceServerUpdate, _guild: Discordeno.DiscordenoGuild) => {
            Bot.musicNode.handleVoiceUpdate(Discordeno.snakelize(payload))
        },

        voiceStateUpdate: async (_member: Discordeno.DiscordenoMember, voiceState: Discordeno.VoiceState) => {
            Bot.musicNode.handleVoiceUpdate(Discordeno.snakelize(voiceState))


            // Bot automatically disconnects if it's alone in the channel
            let guildId: string | bigint | undefined = voiceState?.guildId

            if(!guildId) {
                return
            } else {
                guildId = BigInt(guildId)

                const player = Bot.guildPlayers.get(guildId)

                if(!player || !player.playing || !player.connected) {
                    return
                } else {
                    const guild = Discordeno.cache.guilds.get(guildId) || await Discordeno.getGuild(guildId)

                    if(!player.channelId)
                        return

                    const channel = guild.channels.get(player.channelId)

                    if(!channel)
                        return
                    
                    if(channel.connectedMembers?.has(Discordeno.botId) && channel.connectedMembers?.size == 1) {
                        player.disconnect()

                        Bot.guildQueues.delete(guildId)
                        Bot.guildPlayers.delete(guildId)
            
                        Bot.musicNode.destroyPlayer(guildId)
                    }
                }
            }
        },

    }
} as Discordeno.BotConfig)