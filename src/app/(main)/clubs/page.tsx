import ClubsClient from '@/features/clubs/ClubsClient'
import { getClubsSnapshot } from '@/features/clubs/server'

export default async function ClubsPage() {
    const initialClubs = await getClubsSnapshot()
    return <ClubsClient initialClubs={initialClubs} />
}

