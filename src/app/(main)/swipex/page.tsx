import { SwipeXClient } from '@/features/swipex/SwipeXClient'
import { getSwipeDeckSnapshot } from '@/features/swipex/server'

export default async function SwipeXPage() {
    const snapshot = await getSwipeDeckSnapshot()

    return <SwipeXClient initialCandidates={snapshot.candidates} />
}
