/** Si ya se vio (o se saltó) la bienvenida del primer uso. */
import { createPersistedStore, useStore, type VersionedSchema } from './store'

interface Onboarding {
  done: boolean
}

const SCHEMA: VersionedSchema<Onboarding> = {
  version: 1,
  migrations: {},
  parse: (raw) => ({ done: raw.done === true }),
}

const store = createPersistedStore<Onboarding>({ ...SCHEMA, key: 'tecla:onboarding', fallback: { done: false } })

export const useOnboardingDone = () => useStore(store).done

export function finishOnboarding() {
  store.set({ done: true })
}
