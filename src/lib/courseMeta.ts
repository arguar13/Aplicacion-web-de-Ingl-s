/**
 * Curso de inglés por niveles del Marco Común Europeo: qué es cada nivel. El contenido (lecciones,
 * ejercicios y examen) vive en src/data/course/<nivel>.json y se carga al abrir el nivel; esto es
 * lo que necesitan las rutas y el inicio, sin datos.
 */
export const COURSE_LEVELS = [
  { id: 'a1', name: 'A1', title: 'Principiante', description: 'Presentarte, tu rutina y lo que te rodea.' },
  { id: 'a2', name: 'A2', title: 'Elemental', description: 'Contar lo que pasó, comparar y hacer planes.' },
  { id: 'b1', name: 'B1', title: 'Intermedio', description: 'Opinar, suponer, dar consejos y contar lo que dijeron.' },
  {
    id: 'b2',
    name: 'B2',
    title: 'Intermedio alto',
    description: 'Matices del tiempo, hipótesis y verbos con partícula.',
  },
  { id: 'c1', name: 'C1', title: 'Avanzado', description: 'Énfasis, deducciones y registro formal.' },
  { id: 'c2', name: 'C2', title: 'Maestría', description: 'Estructuras formales, modismos y precisión.' },
] as const

export type CourseLevelId = (typeof COURSE_LEVELS)[number]['id']

export const isCourseLevelId = (value: string): value is CourseLevelId =>
  COURSE_LEVELS.some((level) => level.id === value)

// `id` es siempre uno de COURSE_LEVELS (lo garantiza el tipo); el primero solo contenta al compilador.
export const courseLevelInfo = (id: CourseLevelId) => COURSE_LEVELS.find((level) => level.id === id) ?? COURSE_LEVELS[0]

/** Acierto mínimo para aprobar el examen de un nivel. */
export const EXAM_PASS = 0.8
