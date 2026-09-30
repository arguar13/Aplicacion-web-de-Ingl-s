/**
 * Colecciones temáticas: nombre y descripción de cada una. Las palabras de cada tema viven en
 * src/data/topics.json (lo genera scripts/build_topics.py) y se cargan con la pantalla de
 * colecciones; esto es solo lo que necesitan las rutas y el inicio, sin datos.
 */
export const TOPICS = [
  { id: 'comida', name: 'Comida y bebida', description: 'Del desayuno a la cena, en la mesa y en el mercado.' },
  { id: 'animales', name: 'Animales', description: 'Mascotas, granja, selva y mar.' },
  { id: 'naturaleza', name: 'Naturaleza', description: 'Paisajes, plantas, el cielo y la Tierra.' },
  { id: 'cuerpo', name: 'El cuerpo', description: 'Partes del cuerpo y lo que hace.' },
  { id: 'personas', name: 'Personas', description: 'Familia, oficios y cómo llamamos a la gente.' },
  { id: 'emociones', name: 'Emociones', description: 'Lo que sentimos y cómo lo decimos.' },
  { id: 'comunicacion', name: 'Comunicación', description: 'Palabras sobre palabras: hablar, escribir, informar.' },
  { id: 'mente', name: 'Pensar y aprender', description: 'Ideas, conocimiento y memoria.' },
  { id: 'ropa', name: 'Ropa', description: 'Prendas, calzado y accesorios.' },
  { id: 'transporte', name: 'Transporte', description: 'Vehículos, caminos y viajes.' },
  { id: 'edificios', name: 'Casa y edificios', description: 'Habitaciones, tiendas y construcciones.' },
  { id: 'objetos', name: 'Objetos', description: 'Herramientas, aparatos y cosas de todos los días.' },
  { id: 'lugares', name: 'Lugares', description: 'Ciudades, regiones y direcciones.' },
  { id: 'tiempo', name: 'El tiempo', description: 'Días, estaciones y momentos.' },
  { id: 'movimiento', name: 'Movimiento', description: 'Ir, venir, correr y todo lo que se mueve.' },
  { id: 'dinero', name: 'Dinero', description: 'Comprar, pagar, ganar y ahorrar.' },
  { id: 'sociedad', name: 'Sociedad', description: 'Grupos, instituciones y comunidades.' },
  { id: 'materiales', name: 'Materiales', description: 'De qué están hechas las cosas.' },
  { id: 'medidas', name: 'Formas y medidas', description: 'Cantidades, unidades y figuras.' },
] as const

export type TopicId = (typeof TOPICS)[number]['id']

// `id` es siempre uno de TOPICS (lo garantiza el tipo); el primero solo contenta al compilador.
export const topicInfo = (id: TopicId) => TOPICS.find((topic) => topic.id === id) ?? TOPICS[0]

export const isTopicId = (value: string): value is TopicId => TOPICS.some((topic) => topic.id === value)
