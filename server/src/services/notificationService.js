let broadcast = () => {};

export function setNotificationBroadcaster(handler) {
  broadcast = handler;
}

export function notify(event) {
  broadcast({ ...event, sentAt: new Date().toISOString() });
}
