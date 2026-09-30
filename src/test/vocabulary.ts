/**
 * En la app, main.tsx carga el vocabulario antes de importar nada que lo use. En los tests se fija
 * aquí, de forma síncrona, antes de cada archivo (setupFiles en vite.config.ts).
 */
import words from '@/data/words.json'
import { setVocabulary } from '@/lib/vocabulary'
import { parseWords } from '@/lib/words'

setVocabulary(parseWords(words))
