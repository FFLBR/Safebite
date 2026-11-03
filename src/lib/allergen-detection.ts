export type Allergy = 'Лактоза' | 'Орехи и арахис' | 'Соя'
export type SafetyStatus = 'safe' | 'caution' | 'danger'

export type DetectedMatch = {
  word: string
  allergen: Allergy
  trace: boolean
  start: number
  end: number
}

export type ScanAnalysis = {
  status: SafetyStatus
  matches: DetectedMatch[]
  containsAllergens: Allergy[]
  traceAllergens: Allergy[]
  activeMatches: DetectedMatch[]
}

// Маркеры: основы слов, по которым в тексте состава определяется общий аллерген.
const ALLERGEN_MARKERS: Record<Allergy, string[]> = {
  Лактоза: ['молок', 'лактоз', 'сливк', 'сливочн', 'сыворот', 'казеин', 'творог', 'сыр', 'кефир', 'йогурт', 'пахта'],
  'Орехи и арахис': ['орех', 'арахис', 'миндал', 'фундук', 'кешью', 'фисташ', 'пекан', 'грецк', 'макадам'],
  Соя: ['соя', 'соев', 'тофу', 'эдамам'],
}

// Фразы, после которых перечисленные аллергены считаются возможными следами, а не ингредиентами.
const TRACE_PATTERN = /может содержать|возможн\w* следы|следы|перекрест/

function normalize(text: string) {
  return text.toLocaleLowerCase('ru').replaceAll('ё', 'е')
}

function findAllergen(word: string): Allergy | null {
  const entry = (Object.keys(ALLERGEN_MARKERS) as Allergy[]).find((allergen) =>
    ALLERGEN_MARKERS[allergen].some((marker) => word.startsWith(marker)),
  )
  return entry ?? null
}

// Находит маркеры аллергенов в тексте состава и сверяет их с активным профилем пользователя.
export function analyzeIngredients(text: string, activeAllergies: Allergy[]): ScanAnalysis {
  const normalized = normalize(text)
  const traceStart = normalized.search(TRACE_PATTERN)
  const seen = new Set<string>()
  const matches: DetectedMatch[] = []

  for (const token of normalized.matchAll(/[а-я]+/g)) {
    const word = token[0]
    const start = token.index ?? 0
    const allergen = findAllergen(word)
    if (!allergen) continue
    const trace = traceStart !== -1 && start >= traceStart
    const key = `${allergen}:${word}:${trace}`
    if (seen.has(key)) continue
    seen.add(key)
    matches.push({ word, allergen, trace, start, end: start + word.length })
  }

  const direct = matches.filter((match) => !match.trace)
  const traces = matches.filter((match) => match.trace)
  const dangerMatches = direct.filter((match) => activeAllergies.includes(match.allergen))
  const cautionMatches = traces.filter((match) => activeAllergies.includes(match.allergen))
  const status: SafetyStatus = dangerMatches.length ? 'danger' : cautionMatches.length ? 'caution' : 'safe'

  return {
    status,
    matches,
    containsAllergens: [...new Set(direct.map((match) => match.allergen))],
    traceAllergens: [...new Set(traces.map((match) => match.allergen))].filter(
      (allergen) => !direct.some((match) => match.allergen === allergen),
    ),
    activeMatches: [...dangerMatches, ...cautionMatches],
  }
}
