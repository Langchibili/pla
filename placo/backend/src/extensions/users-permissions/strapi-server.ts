export default (plugin: any) => {
  const plaOnlyMessage = 'Sign in with your Pro League Africa account.';
  for (const action of ['callback', 'register', 'resetPassword', 'refresh']) {
    plugin.controllers.auth[action] = async (ctx: any) => ctx.forbidden(plaOnlyMessage);
  }
  return plugin;
};
