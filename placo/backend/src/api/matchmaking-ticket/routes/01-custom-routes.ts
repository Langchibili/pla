export default {
  routes: [
    { method: 'POST', path: '/matchmaking/enqueue', handler: 'matchmaking-ticket.enqueue', config: { auth: { scope: [] }, policies: [] } },
    { method: 'POST', path: '/matchmaking/:ticketCode/cancel', handler: 'matchmaking-ticket.cancel', config: { auth: { scope: [] }, policies: [] } },
  ],
};
