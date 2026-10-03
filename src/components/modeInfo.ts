import type { ComponentType, SVGProps } from 'react'
import type { Mode } from '@/lib/types'
import { CardsIcon, ClozeIcon, DictationIcon, HeadphonesIcon, KeyboardIcon, ReverseIcon, TranslateIcon } from './icons'

/** Nombre, pista e icono de cada modo de práctica. */
export const MODE_INFO: Record<Mode, { label: string; hint: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  'en-es': { label: 'Traducir', hint: 'Inglés → español', Icon: TranslateIcon },
  'es-en': { label: 'Inverso', hint: 'Español → inglés', Icon: ReverseIcon },
  listen: { label: 'Escuchar', hint: 'Solo el audio', Icon: HeadphonesIcon },
  type: { label: 'Escribir', hint: 'Con el teclado', Icon: KeyboardIcon },
  cloze: { label: 'Completar', hint: 'En una frase', Icon: ClozeIcon },
  flash: { label: 'Tarjetas', hint: 'Tú te calificas', Icon: CardsIcon },
  dictation: { label: 'Dictado', hint: 'Oír y escribir', Icon: DictationIcon },
}

/** Orden en que se presentan: de reconocer a producir. */
export const MODE_ORDER: readonly Mode[] = ['en-es', 'es-en', 'listen', 'type', 'cloze', 'flash', 'dictation']
