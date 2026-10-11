// A API fica na mesma origem do front: em produção por proxy reverso, no perfil "online" porque a própria API serve o front,
// e em desenvolvimento pelo proxy do `ng serve` (proxy.conf.json). Mesma origem = sem CORS e o cookie de login (SameSite=Strict) funciona.
export const environment = {
  apiUrl: '/api',
};
