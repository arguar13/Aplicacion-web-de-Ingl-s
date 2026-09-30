/**
 * index.html pinta la bienvenida antes de que llegue la app a quien entra por primera vez, y lo
 * marca en <html data-prerendered>. La app la reemplaza al montarse: sin repetir la animación de
 * entrada, que haría desaparecer y volver a aparecer un texto que ya se estaba leyendo.
 */
export const welcomePrerendered =
  typeof document !== 'undefined' && document.documentElement.hasAttribute('data-prerendered')
