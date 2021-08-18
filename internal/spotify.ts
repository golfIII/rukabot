const keyLifetime = 3600
let currentAuthKey = ''
let lastRefresh = 0

export function isSpotifyLink(link: string): boolean {
    return link.includes('spotify')
}

export function isSpotifyTrack(link: string): boolean {
    return link.includes('track')
}

export function getPlaylistId(link: string): string | undefined {
    const regex = /playlist\/([\w\d]+)/gm
    const matches = regex.exec(link)

    if(!matches || !matches[1]) {
        return undefined
    } else {
        return matches[1]
    }
}

export function getTrackId(link: string): string | undefined {
    const regex = /track\/([^\?]+)/gm
    const matches = regex.exec(link)

    if(!matches || !matches[1]) {
        return undefined
    } else {
        return matches[1]
    }
}

export async function getAuthCode(): Promise<string | undefined> {
    const elapsed = (Date.now() - lastRefresh) / 1000 // convert to seconds for comparison

    if(elapsed > keyLifetime) {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization':'Basic ${SPOTIFY_TOKEN}',
                'Content-Type':'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials' 
        })
    
        const json = await response.json()

        if(!json) {
            console.log('failed to get auth key!')
            return undefined
        }

        currentAuthKey = json.access_token

        if(!currentAuthKey) {
            console.log('got response, but no auth key!')
            return undefined
        }

        lastRefresh = Date.now()
    }

    return currentAuthKey
}

// Returns a list of query terms, which are formatted in the manner Artist(s) - Song
export async function getPlaylistTracks(playlistId: string, isSingle: boolean): Promise<string[] | undefined> {
    const key = await getAuthCode()

    if(!key) {
        console.log('auth key failed!')
        return undefined
    }


    if(!isSingle) {
        // Form the API call to get the playlist
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization':`Bearer ${key}`,
                'Content-Type':'application/json'
            }
        })

        if(!response) {
            console.log('couldn\'t load playlist')
            return undefined
        }

        const json = await response.json()

        if(!json || json.error) {
            console.log('failed to load json: ' + json.error)
            return undefined
        }

        // JSON is valid, continue
        const queryTerms: string[] = []

        for(const item of json.items) {
            // Build the artist portion
            const artists: string[] = []
            for(const artist of item.track.artists) {
                artists.push(artist.name)
            }

            const qArtists = artists.join(' ')

            // Create the full query term
            queryTerms.push(`${qArtists} - ${item.track.name}`)
        }

        return queryTerms
    } else {
        const response = await fetch(`https://api.spotify.com/v1/tracks/${playlistId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization':`Bearer ${key}`,
                'Content-Type':'application/json'
            }
        })

        if(!response) {
            console.log('couldn\'t load playlist')
            return undefined
        }

        const json = await response.json()

        if(!json || json.error) {
            console.log('failed to load json: ' + json.error)
            return undefined
        }

        const artists: string[] = []
        for(const artist of json.artists) {

            artists.push(artist.name)
        }
        const qArtists = artists.join(' ')

        return [`${qArtists} - ${json.name}`]
    }
}
