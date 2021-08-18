import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Player } from 'https://deno.land/x/lavadeno@3.2.0/mod.ts'
import { Bot } from '../../global.ts'

import * as YtAPI from '../../internal/ytreqs.ts'
import * as SpotifyAPI from '../../internal/spotify.ts'

// NOTE - requires LavaLink. Run with
// java -jar Lavalink.jar

// Amount of songs that should automatically play in a playlist
// to allow the user something to listen to while the rest load
const songLoadAmnt = 5

async function playQueueUntilEnd(msg: Discordeno.DiscordenoMessage, player: Player, guildId: bigint) {

    console.log('play called')

    const queue = Bot.guildQueues.get(guildId)

    if(!queue) {
        await Bot.replyTextEmbed(msg, ':x: Something went wrong...')
        return
    }

    try {
        const connection = await player.play(queue[0].track)

        const link = YtAPI.getVideoId(queue[0].link) || queue[0].link

        await Bot.sendTextEmbed(msg, `:fast_forward: [Now Playing: ${queue[0].title}](https://www.youtube.com/watch?v=${link}}) [<@${queue[0].queued}>]`)

        const current = queue.shift()

        if(current)
            Bot.guildCurrentTrack.set(guildId, current)

        connection
            .once('trackEnd', async () => {
                // If we have no more songs, end the queue
                if(queue.length < 1) {
                    await Bot.replyTextEmbed(msg, ':white_check_mark: Finished the queue!')
                    player.disconnect()
                    Bot.guildQueues.delete(msg.guildId)
                } else {
                    // Recursively play until we're done
                    await playQueueUntilEnd(msg, player, guildId)
                }
            })
    } catch(err) {
        console.log('Player failed to play (abrupt stop?): ' + err)
        player.disconnect()
        await Bot.musicNode.destroyPlayer(msg.guildId)
    }
}

export interface SongInfo {
    track: string, // track for lavalink
    title: string, // song title
    link: string, // youtube link to the song
    queued: bigint, // id of who queued the song
}

Bot.globalCommands.commands.add({
    command: 'play',
    usage: `${Bot.prefix}.play {title OR link}`,
    description: 'Plays the given song or playlist from the given name or link. Will search youtube if given a title',
    execute: async (msg: Discordeno.DiscordenoMessage, tokens: string[]) => {
        // Check if it's possible to see or join the VCs within this guild
        const hasPerms = await Discordeno.hasGuildPermissions(msg.guildId, Discordeno.botId, ['CONNECT', 'VIEW_CHANNEL'])
        if(!hasPerms) {
            await Bot.replyTextEmbed(msg, ':x: I don\'t have permissions to connect or view the channel that you\'re in!')
            return
        }

        // Check if they've supplied some sort of query term
        if(tokens.length < 1) {
            await Bot.replyTextEmbed(msg, ':x: You didn\'t enter a link / video title!')
            return
        }

        // Get the guild, automatically try both cache and api if cache fails
        const guild: Discordeno.DiscordenoGuild = Discordeno.cache.guilds.get(msg.guildId) || await Discordeno.getGuild(msg.guildId)

        // Attempt to get the voice data (may not exist)
        const memberVoiceData = guild.voiceStates.get(msg.authorId)

        // Handle the case in which the voice data doesn't exist
        if(!memberVoiceData || !memberVoiceData.channelId) {
            await Bot.replyTextEmbed(msg, ':x: You aren\'t in a voice channel!')
            return
        }

        let player = Bot.guildPlayers.get(msg.guildId)

        if(!player) {
            // Player doesn't exist - make a new one
            player = Bot.musicNode.createPlayer(msg.guildId)

            await player.connect(memberVoiceData.channelId)

            // Set the player, will be used to skip & stop current queue
            Bot.guildPlayers.set(msg.guildId, player)
        } else {
            if(!player.playing) {
                await player.connect(memberVoiceData.channelId)
            }
        }


        const query = tokens.join(' ')
        let didPreload = false

        const songInfo: SongInfo[] = []

        if(YtAPI.isYoutubeLink(query)) {
            // we have a video, potentially a playlist
            const playlistId = YtAPI.getPlaylistId(query)

            if(playlistId) {
                console.log(playlistId)
                // we have a playlist; get the IDs & add them to queue
                const ids = await YtAPI.getPlaylistVideos(playlistId)
                if(!ids) {
                    await Bot.replyTextEmbed(msg, ':x: Failed to get embed - are you sure you have a valid playlist?')
                    return
                }

                await Bot.replyTextEmbed(msg, ':mag_right: Loading YouTube Playlist (Should take ~1 minute)')

                let failedLoads = 0

                for(const id of ids) {
                    const searched = await Bot.musicNode.rest.loadTracks(`https://www.youtube.com/watch?v=${id}`)

                    if(searched.tracks[0]) {
                        songInfo.push({
                            track: searched.tracks[0].track,
                            title: searched.tracks[0].info.title,
                            link: searched.tracks[0].info.uri,
                            queued: msg.authorId
                        } as SongInfo)

                    } else {
                        failedLoads++
                    }

                    if(songInfo.length == songLoadAmnt) {
                        // Add the song(s) to queue, to give the user something to listen to while the rest load
                        const currQueue = Bot.guildQueues.get(msg.guildId)
                        if(!currQueue) {
                            console.log('first queue')
                            Bot.guildQueues.set(msg.guildId, songInfo)
                            didPreload = true
                            // Begin playing
                            await playQueueUntilEnd(msg, player, msg.guildId)
                        }

                    }
                }

                const successSuffix = (songInfo.length+1 > 1) ? 's' : ''
                const failSuffix = (failedLoads > 1) ? 's' : ''
                if(failedLoads != 0)
                    await Bot.replyTextEmbed(msg, `:exclamation: ${failedLoads} video${failSuffix} failed to load - they were either private, age restricted, blocked by your country.`)
                await Bot.sendTextEmbed(msg, `:white_check_mark: Added ${songInfo.length+1} song${successSuffix} to queue`)
            } else {
                // we just have a normal youtube video; add it to the queue
                const vidId = YtAPI.getVideoId(query)

                if(!vidId) {
                    await Bot.replyTextEmbed(msg, `:exclamation: Couldn't find video - is your link valid and not private?`)
                    return
                }
                const searched = await Bot.musicNode.rest.loadTracks(`https://www.youtube.com/watch?v=${vidId}`)

                if(searched.tracks[0]) {
                    songInfo.push({
                        track: searched.tracks[0].track,
                        title: searched.tracks[0].info.title,
                        link: searched.tracks[0].info.uri,
                        queued: msg.authorId
                    } as SongInfo)

                    await Bot.sendTextEmbed(msg, `:white_check_mark: Added ${searched.tracks[0].info.title} to queue [<@${msg.authorId}>]`)
                } else {
                    await Bot.replyTextEmbed(msg, `:exclamation: Couldn't find video - is your link valid and not private?`)
                    return
                }
            }
        } else {
            
            if(SpotifyAPI.isSpotifyLink(query)) {
                // Spotify link
                if(SpotifyAPI.isSpotifyTrack(query)) {
                    const trackId = SpotifyAPI.getTrackId(query)
                    if(!trackId) {
                        await Bot.replyTextEmbed(msg, `:exclamation: Malformed track link`)
                        return
                    }

                    const trackName = await SpotifyAPI.getPlaylistTracks(trackId, true)
                    if(!trackName) {
                        await Bot.replyTextEmbed(msg, `:exclamation: Couldn't find track - is your link valid?`)
                        return
                    }

                    const searched = await Bot.musicNode.rest.loadTracks(`ytsearch:${trackName}`)

                    if(searched.tracks[0]) {
                        songInfo.push({
                            track: searched.tracks[0].track,
                            title: searched.tracks[0].info.title,
                            link: searched.tracks[0].info.uri,
                            queued: msg.authorId
                        } as SongInfo)
                        await Bot.sendTextEmbed(msg, `:white_check_mark: Added ${searched.tracks[0].info.title} to queue [<@${msg.authorId}>]`)
                    } else {
                        await Bot.replyTextEmbed(msg, `:exclamation: Couldn't find video - is your link valid and not private?`)
                    }
                } else {
                    // playlist
                    await Bot.replyTextEmbed(msg, ':mag_right: Loading Spotify Playlist (Will take at least 1 minute!)')
                    const playlistId = SpotifyAPI.getPlaylistId(query)

                    if(!playlistId) {
                        await Bot.replyTextEmbed(msg, `:exclamation: Malformed track link`)
                        return
                    }

                    const tracks = await SpotifyAPI.getPlaylistTracks(playlistId, false)
                    if(!tracks) {
                        await Bot.replyTextEmbed(msg, `:exclamation: Couldn't find track - is your link valid?`)
                        return
                    }

                    let failedLoads = 0

                    for(const track of tracks) {
                        const searched = await Bot.musicNode.rest.loadTracks(`ytsearch:${track}`)

                        if(searched.tracks[0]) {
                            songInfo.push({
                                track: searched.tracks[0].track,
                                title: searched.tracks[0].info.title,
                                link: searched.tracks[0].info.uri,
                                queued: msg.authorId
                            } as SongInfo)
                        } else {
                            failedLoads++
                        }

                        if(songInfo.length == songLoadAmnt) {
                            // Add the song(s) to queue, to give the user something to listen to while the rest load
                            const currQueue = Bot.guildQueues.get(msg.guildId)
                            if(!currQueue) {
                                console.log('first queue')
                                Bot.guildQueues.set(msg.guildId, songInfo)
                                didPreload = true
                                // Begin playing
                                await playQueueUntilEnd(msg, player, msg.guildId)
                            }
                        }
                    }

                    const successSuffix = (songInfo.length > 1) ? 's' : ''
                    const failSuffix = (failedLoads > 1) ? 's' : ''
                    if(failedLoads != 0)
                        await Bot.replyTextEmbed(msg, `:exclamation: ${failedLoads} video${failSuffix} failed to load - they were either private, age restricted, blocked by your country.`)
                    await Bot.sendTextEmbed(msg, `:white_check_mark: Added ${songInfo.length} song${successSuffix} to queue`)
                }
            } else {
                // Query terms - look them up
                const searched = await Bot.musicNode.rest.loadTracks(`ytsearch:${query}`)

                if(searched.tracks[0]) {
                    songInfo.push({
                        track: searched.tracks[0].track,
                        title: searched.tracks[0].info.title,
                        link: searched.tracks[0].info.uri,
                        queued: msg.authorId
                    } as SongInfo)
                    await Bot.sendTextEmbed(msg, `:white_check_mark: Added ${searched.tracks[0].info.title} to queue [<@${msg.authorId}>]`)
                } else {
                    await Bot.replyTextEmbed(msg, `:exclamation: Couldn't find video - is your link valid and not private?`)
                }
            }
        }

        if(songInfo.length < 1)
            return

        // Add the song(s) to queue
        let currQueue = Bot.guildQueues.get(msg.guildId)

        if(didPreload && currQueue) {
            console.log('preloaded ; skipping songs')
            currQueue = currQueue.slice(songLoadAmnt, -1)
        }

        if(!currQueue) {
            console.log('first queue')
            Bot.guildQueues.set(msg.guildId, songInfo)
            // Begin playing
            await playQueueUntilEnd(msg, player, msg.guildId)
        } else {
            console.log('adding to queue')
            currQueue.push(...songInfo)
        }

    }
})

Bot.globalCommands.commands.add({
    command: 'clear',
    usage: `${Bot.prefix}.clear`,
    description: 'Clears and stops the current server queue',
    execute: async (msg: Discordeno.DiscordenoMessage, _tokens: string[]) => {
        const player = Bot.guildPlayers.get(msg.guildId)
        if(!player) {
            await Bot.replyTextEmbed(msg, ':x: There\'s no queue playing!')
            return
        } else {
            player.disconnect()
            // clear the queue
            Bot.guildQueues.delete(msg.guildId)
            // delete the player
            Bot.guildPlayers.delete(msg.guildId)

            Bot.musicNode.destroyPlayer(msg.guildId)

            await Bot.replyTextEmbed(msg, ':white_check_mark: Cleared and stopped queue')
        }
    }
})

Bot.globalCommands.commands.add({
    command: 'skip',
    usage: `${Bot.prefix}.skip {song num}`,
    description: 'Skips the current {song num} song(s). Defaults to skipping the current song if no number is given',
    execute: async (msg: Discordeno.DiscordenoMessage, tokens: string[]) => {
        const skipnum = Number(tokens[0]) || 1

        const player = Bot.guildPlayers.get(msg.guildId)
        if(!player) {
            await Bot.replyTextEmbed(msg, ':x: There\'s no queue playing!')
            return
        } else {
            await Bot.replyTextEmbed(msg, `:fast_forward: Skipped ${skipnum}!`)
            const queue = Bot.guildQueues.get(msg.guildId)

            if(!queue) {
                await Bot.replyTextEmbed(msg, ':x: Couldn\'t find server queue')
                return
            }

            for(let i = 0; i < skipnum - 1; ++i)
                queue.shift()

            await player.stop()
            // automatically calls the 'end' event
            return
        }
    }
})

Bot.globalCommands.commands.add({
    command: 'queue',
    usage: `${Bot.prefix}.queue`,
    description: 'Shows the next 25 songs in the current queue',
    execute: async (msg: Discordeno.DiscordenoMessage, _tokens: string[]) => {
        const player = Bot.guildPlayers.get(msg.guildId)
        if(!player) {
            await Bot.replyTextEmbed(msg, ':x: There\'s no queue playing!')
            return
        } else {
            // build the embed fields
            const embedFields: Discordeno.EmbedField[] = []

            const queue = Bot.guildQueues.get(msg.guildId)

            if(!queue) {
                await Bot.replyTextEmbed(msg, ':x: There\'s no queue playing!')
                return
            }

            const currentTrack = Bot.guildCurrentTrack.get(msg.guildId)

            if(currentTrack) {
                embedFields.push({
                    name: `:arrow_forward: ${currentTrack.title} (Current)`,
                    value: `Queued by: [<@${currentTrack.queued}>]`,
                    inline: false
                } as Discordeno.EmbedField)
            }

            for(const track of queue) {
                embedFields.push({
                    name: `${track.title}`,
                    value: `Queued by: [<@${track.queued}>]`,
                    inline: false
                } as Discordeno.EmbedField)

                if(embedFields.length > 25)
                    break
            }

            const guild: Discordeno.DiscordenoGuild = Discordeno.cache.guilds.get(msg.guildId) || await Discordeno.getGuild(msg.guildId)

            await msg.reply({
                embeds: [{
                    title: `Queue for ${guild.name} (${queue.length + 1} tracks)`,
                    fields: embedFields
                }]
            }, false)

        }
    }
})