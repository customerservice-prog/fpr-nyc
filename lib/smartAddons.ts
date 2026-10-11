export type SmartAddonSource = {
  id?: string
  name: string
  slug: string
  category?: { name: string; slug: string } | null
}

export type SmartAddonCandidate = {
  id: string
  name: string
  slug: string
  category?: { name: string; slug: string } | null
}

type WeightedTerm = { term: string; weight: number }
type Rule = { when: RegExp; terms: WeightedTerm[] }

const RULES: Rule[] = [
  {
    when: /\btent\b|\bcanopy\b|\bparty rental package\b/i,
    terms: [
      { term: 'tent lighting', weight: 140 },
      { term: 'side wall', weight: 135 },
      { term: 'sidewall', weight: 135 },
      { term: 'bistro', weight: 120 },
      { term: 'string light', weight: 120 },
      { term: 'cocktail table', weight: 105 },
      { term: 'dance floor', weight: 100 },
      { term: 'fan', weight: 85 },
      { term: 'generator', weight: 80 },
      { term: 'fill and chill', weight: 70 },
    ],
  },
  {
    when: /\bwedding\b|\breception\b|\bceremony\b/i,
    terms: [
      { term: 'dance floor', weight: 140 },
      { term: 'bistro', weight: 130 },
      { term: 'string light', weight: 130 },
      { term: 'cocktail table', weight: 115 },
      { term: 'photo booth', weight: 110 },
      { term: 'speaker', weight: 95 },
      { term: 'generator', weight: 75 },
    ],
  },
  {
    when: /\bbounce\s*house\b|\bwater\s*slide\b|\bwaterslide\b|\binflatable\b/i,
    terms: [
      { term: 'generator', weight: 135 },
      { term: 'speaker', weight: 95 },
      { term: 'cooler', weight: 85 },
      { term: 'cotton candy', weight: 75 },
      { term: 'popcorn', weight: 75 },
      { term: 'snow cone', weight: 75 },
    ],
  },
  {
    when: /\bfoam\b.*\bmachine\b|\bfoam party\b/i,
    terms: [
      { term: 'generator', weight: 140 },
      { term: 'speaker', weight: 95 },
      { term: 'cooler', weight: 75 },
    ],
  },
  {
    when: /\bpopcorn\b.*\bmachine\b/i,
    terms: [
      { term: 'popcorn kernel', weight: 170 },
      { term: 'speaker', weight: 60 },
    ],
  },
  {
    when: /\bcotton\s*candy\b.*\bmachine\b/i,
    terms: [
      { term: 'floss sugar', weight: 170 },
      { term: 'speaker', weight: 60 },
    ],
  },
  {
    when: /\bsnow\s*cone\b.*\bmachine\b/i,
    terms: [
      { term: 'snow cone syrup', weight: 170 },
      { term: 'cooler', weight: 85 },
    ],
  },
  {
    when: /\binflatable\b.*\bmovie\s*screen\b|\bmovie\s*screen\b/i,
    terms: [
      { term: 'generator', weight: 145 },
      { term: 'speaker', weight: 135 },
      { term: 'popcorn', weight: 90 },
    ],
  },
  {
    when: /\bphoto\s*booth\b/i,
    terms: [
      { term: 'backdrop', weight: 150 },
      { term: '4x6', weight: 140 },
      { term: 'extra hour', weight: 130 },
      { term: 'props', weight: 120 },
      { term: 'stanchion', weight: 70 },
    ],
  },
  {
    when: /\bdance\s*floor\b/i,
    terms: [
      { term: 'bistro', weight: 130 },
      { term: 'string light', weight: 125 },
      { term: 'speaker', weight: 115 },
      { term: 'cocktail table', weight: 95 },
      { term: 'photo booth', weight: 85 },
    ],
  },
  {
    when: /\bcocktail\s*table\b/i,
    terms: [
      { term: 'spandex cocktail', weight: 150 },
      { term: 'speaker', weight: 90 },
      { term: 'stanchion', weight: 80 },
      { term: 'bistro', weight: 75 },
    ],
  },
  {
    when: /\b(round|banquet|plastic|wood)\b.*\btable\b|\btable\b.*\b(round|banquet)\b/i,
    terms: [
      { term: 'linen', weight: 140 },
      { term: 'chair', weight: 115 },
      { term: 'napkin', weight: 80 },
    ],
  },
  {
    when: /\bchair\b|\bchiavari\b/i,
    terms: [
      { term: 'round table', weight: 110 },
      { term: 'banquet table', weight: 105 },
      { term: 'linen', weight: 95 },
      { term: 'cocktail table', weight: 70 },
    ],
  },
  {
    when: /\bspeaker\b|\bpodium\b|\bmicrophone\b/i,
    terms: [
      { term: 'speaker', weight: 105 },
      { term: 'podium', weight: 105 },
      { term: 'stanchion', weight: 75 },
    ],
  },
  {
    when: /\bcornhole\b|\bconnect four\b|\btumbling timbers\b|\bgame\b/i,
    terms: [
      { term: 'speaker', weight: 95 },
      { term: 'cooler', weight: 80 },
      { term: 'cocktail table', weight: 70 },
    ],
  },
]

function sourceText(source: SmartAddonSource) {
  return [source.name, source.slug, source.category?.name, source.category?.slug].filter(Boolean).join(' ').toLowerCase()
}

function dimensionPairs(value: string) {
  const compact = value.toLowerCase().replace(/\s+/g, '')
  return Array.from(compact.matchAll(/(\d{1,3})(?:x|×)(\d{1,3})/g)).map((match) => {
    const a = Number(match[1])
    const b = Number(match[2])
    return {
      key: [a, b].sort((x, y) => x - y).join('x'),
      sides: [a, b],
    }
  })
}

function linearFeet(value: string) {
  return Array.from(value.toLowerCase().matchAll(/\b(\d{1,3})\s*(?:'|ft\.?|feet|foot)(?=\s|$|[^a-z0-9])/g)).map((match) => Number(match[1]))
}

function addonFamily(value: string) {
  const name = value.toLowerCase()
  if (/tent lighting|bistro|string light|lighting/.test(name)) return 'lighting'
  if (/side\s*wall|sidewall/.test(name)) return 'sidewall'
  if (/cocktail table/.test(name)) return 'cocktail-table'
  if (/dance floor/.test(name)) return 'dance-floor'
  if (/\bfan\b/.test(name)) return 'fan'
  if (/generator/.test(name)) return 'generator'
  if (/photo booth/.test(name)) return 'photo-booth'
  if (/backdrop/.test(name)) return 'backdrop'
  if (/speaker/.test(name)) return 'speaker'
  if (/stanchion/.test(name)) return 'stanchion'
  if (/linen|tablecloth|overlay/.test(name)) return 'linen'
  if (/napkin/.test(name)) return 'napkin'
  if (/\bchair\b|chiavari/.test(name)) return 'chair'
  if (/cooler|fill and chill/.test(name)) return 'cooling'
  if (/cotton candy|popcorn|snow cone/.test(name)) return 'concession'
  return name.replace(/\d+/g, '').replace(/[^a-z]+/g, ' ').trim().slice(0, 40)
}

function tableLengthFeet(value: string) {
  const text = value.toLowerCase()
  const values = new Set<number>()
  for (const match of text.matchAll(/\b(\d{1,2})\s*(?:ft\.?|feet|foot|'|′)\b/g)) values.add(Number(match[1]))
  for (const match of text.matchAll(/\b(\d{2,3})\s*(?:in(?:ch(?:es)?)?|"|″)\b/g)) {
    const inches = Number(match[1])
    if (inches % 12 === 0) values.add(inches / 12)
  }
  return Array.from(values)
}

function roundLinenDiameterInches(value: string) {
  const text = value.toLowerCase()
  const patterns = [
    /\b(\d{2,3})\s*(?:-|\s)*inch(?:es)?\s+round\b/,
    /\b(\d{2,3})\s*(?:"|″)\s+round\b/,
    /\b(\d{2,3})\s+round\s+(?:[a-z-]+\s+){0,3}(?:linen|tablecloth|overlay)\b/,
    /\bround\s+(\d{2,3})\s*(?:"|″)?\b/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return Number(match[1])
  }
  return null
}

function passesTableLinenCompatibility(sourceTextValue: string, candidateName: string) {
  const source = sourceTextValue.toLowerCase()
  const candidate = candidateName.toLowerCase()
  const candidateIsLinen = /linen|tablecloth|overlay|spandex.*(?:cover|cocktail)|cocktail.*cover/.test(candidate)
  if (!candidateIsLinen || !/\btable\b/.test(source)) return true

  const sourceIsCocktail = /cocktail\s*table/.test(source)
  const sourceIsRound = /\bround\b.*\btable\b|\btable\b.*\bround\b/.test(source)
  const sourceIsRectangular = !sourceIsCocktail && !sourceIsRound && /\b(?:banquet|plastic|wood|folding)\b.*\btable\b|\btable\b.*\b(?:banquet|plastic|wood|folding)\b/.test(source)

  if (sourceIsCocktail) return /spandex.*cocktail|cocktail.*(?:cover|spandex)/.test(candidate)
  if (sourceIsRound) {
    if (!/\bround\b/.test(candidate)) return false
    const sourceFeet = tableLengthFeet(source)
    const linenInches = roundLinenDiameterInches(candidate)
    if (sourceFeet.length === 1 && linenInches !== null) {
      // Full-drop round linen: table diameter plus roughly 30 inches of drop on each side.
      return linenInches === sourceFeet[0] * 12 + 60
    }
    return true
  }
  if (!sourceIsRectangular) return true
  if (/\bround\b|cocktail/.test(candidate)) return false

  const sourceFeet = tableLengthFeet(source)
  const candidateFeet = tableLengthFeet(candidate)
  if (sourceFeet.length && candidateFeet.length) return candidateFeet.some((feet) => sourceFeet.includes(feet))

  // Friendly Party Rental's 72x120 rectangular linen/overlay is a 6-foot-table pairing.
  if (/\b72\s*(?:x|×)\s*120\b/.test(candidate) && sourceFeet.length) return sourceFeet.includes(6)
  return true
}

function passesSizeCompatibility(sourceTextValue: string, candidateName: string) {
  const sourcePairs = dimensionPairs(sourceTextValue)
  const candidatePairs = dimensionPairs(candidateName)
  const sourceSides = new Set(sourcePairs.flatMap((pair) => pair.sides))
  const normalizedCandidate = candidateName.toLowerCase()

  if (/tent lighting/.test(normalizedCandidate)) {
    if (!sourcePairs.length) return candidatePairs.length === 0
    if (!candidatePairs.length) return false
    return candidatePairs.some((candidate) => sourcePairs.some((source) => source.key === candidate.key))
  }

  if (/side\s*wall|sidewall/.test(normalizedCandidate)) {
    const normalizedSource = sourceTextValue.toLowerCase()
    const sourceIsPopUp = /pop[\s-]?up|canopy/.test(normalizedSource)
    const candidateIsPopUp = /pop[\s-]?up|canopy/.test(normalizedCandidate)
    const candidateIsTentSpecific = /\btent\b/.test(normalizedCandidate) && !candidateIsPopUp
    const lengths = linearFeet(candidateName)

    // Pop-up/canopy sidewalls are equipment-specific. Never suggest one for a
    // pole/frame tent just because the word "sidewall" matches.
    if (candidateIsPopUp && !sourceIsPopUp) return false
    if (sourceIsPopUp && candidateIsTentSpecific) return false

    // A sidewall carrying a full footprint such as "10x10 Pop-Up Sidewall"
    // must match the source footprint exactly.
    if (candidatePairs.length) {
      if (!sourcePairs.length) return false
      return candidatePairs.some((candidate) => sourcePairs.some((source) => source.key === candidate.key))
    }

    // Linear panels such as 20' or 30' sidewalls may match one real tent side.
    // Without a known source size, do not guess.
    if (lengths.length) {
      if (!sourceSides.size) return false
      return lengths.some((length) => sourceSides.has(length))
    }

    // Truly generic, unsized sidewall accessories can still be considered.
    return true
  }

  if (!passesTableLinenCompatibility(sourceTextValue, candidateName)) return false

  return true
}

function matchingRules(source: SmartAddonSource) {
  const text = sourceText(source)
  return RULES.filter((rule) => rule.when.test(text))
}

export function getSmartAddonSearchTerms(source: SmartAddonSource) {
  const terms = new Set<string>()
  for (const rule of matchingRules(source)) for (const entry of rule.terms) terms.add(entry.term)
  return Array.from(terms)
}

export function supportsSmartAddons(source: SmartAddonSource) {
  return getSmartAddonSearchTerms(source).length > 0
}

export function isSmartAddonCompatible(source: SmartAddonSource, candidate: { name: string }) {
  return passesSizeCompatibility(sourceText(source), candidate.name)
}

export function rankSmartAddons<T extends SmartAddonCandidate>(source: SmartAddonSource, candidates: T[], limit = 4): T[] {
  const rules = matchingRules(source)
  if (!rules.length) return []

  const text = sourceText(source)
  const sourcePairs = dimensionPairs(text)
  const sourceIsPackage = /\bpackage\b/.test(text)

  const ranked = candidates
    .filter((candidate) => candidate.id && candidate.slug && candidate.id !== source.id)
    .filter((candidate) => isSmartAddonCompatible(source, candidate))
    .map((candidate) => {
      const name = candidate.name.toLowerCase()
      const category = [candidate.category?.name, candidate.category?.slug].filter(Boolean).join(' ').toLowerCase()
      const combined = name + ' ' + category
      let score = 0

      for (const rule of rules) {
        for (const { term, weight } of rule.terms) {
          if (combined.includes(term)) score = Math.max(score, weight)
        }
      }
      if (!score) return { candidate, score: 0, family: addonFamily(name) }

      const candidatePairs = dimensionPairs(combined)
      if (sourcePairs.some((sourcePair) => candidatePairs.some((candidatePair) => sourcePair.key === candidatePair.key))) score += 80

      if (sourceIsPackage && /\bpackage\b/.test(name)) score -= 160
      if (!sourceIsPackage && /\bpackage\b/.test(name)) score -= 120
      if (/repair|replacement|damaged|retired|deposit|delivery fee/i.test(name)) score -= 200

      if (/\bchair\b|\bchiavari\b/.test(text) && /\bchair\b|\bchiavari\b/.test(name)) score -= 95
      if (/\btable\b/.test(text) && /\btable\b/.test(name) && !/cocktail/.test(text + name)) score -= 85
      if (/\bbounce\s*house\b|\bwater\s*slide\b|\bwaterslide\b/.test(text) && /\bbounce\s*house\b|\bwater\s*slide\b|\bwaterslide\b/.test(name)) score -= 130

      return { candidate, score, family: addonFamily(name) }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))

  const selected: T[] = []
  const usedFamilies = new Set<string>()
  for (const entry of ranked) {
    if (usedFamilies.has(entry.family)) continue
    selected.push(entry.candidate)
    usedFamilies.add(entry.family)
    if (selected.length >= limit) break
  }

  return selected
}
