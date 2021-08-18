// Message collector

import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

interface MessageCollectorConfig {
    filter: (im: Discordeno.DiscordenoMessage) => boolean,
    onResolution: (collected: Discordeno.DiscordenoMessage[]) => void,
    max: number
}

class MessageCollector {
    private genesisMsg: Discordeno.DiscordenoMessage

    private collected: Discordeno.DiscordenoMessage[]
    private cfg: MessageCollectorConfig

    constructor(
        msg: Discordeno.DiscordenoMessage,
        cfg: MessageCollectorConfig
    ) {

        this.genesisMsg = msg
        this.collected = []
        if(cfg.max < 1)
            throw new Error('Invalid maximum listening size')
        this.cfg = cfg
    }

    public onMessageCreate(imsg: Discordeno.DiscordenoMessage): boolean {
        // check if the msg channels match and if the filter condition is met
        if(
            imsg.channelId == this.genesisMsg.channelId
            && this.cfg.filter(imsg)
        ) {
            this.collected.push(imsg)

            if(this.collected.length < this.cfg.max) {
                return false
            }
            else {
                this.cfg.onResolution(this.collected)
                return true
            }
        }

        return false

    }
}

class MessageCollectorHandler {
    private collectors: MessageCollector[]

    constructor() {
        this.collectors = []
    }

    public addCollector(col: MessageCollector): number {
        this.collectors.push(col)
        return this.collectors.length - 1
    }

    public getCollector(idx: number): MessageCollector | undefined {
        return this.collectors[idx]
    }

    public onUpdate(msg: Discordeno.DiscordenoMessage) {
        for(const collector of this.collectors) {
            const isResolved = collector.onMessageCreate(msg)

            if(isResolved)
                this.collectors.splice(this.collectors.indexOf(collector), 1)
        }
    }
}

export { MessageCollector, MessageCollectorHandler }