export class P2PService {
  room: any

  constructor() {
    this.room = null
  }

  async broadcastChampionSelection(selection: any): Promise<void> {
    if (this.room) {
      this.room.send('champion-selection', selection)
    }
  }

  // Add other necessary methods as needed
}

const p2pService = new P2PService()
export default p2pService
