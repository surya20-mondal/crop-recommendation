export const FEATURES = [
  { key: 'N', label: 'Nitrogen (N)', unit: 'kg/ha', step: 1 },
  { key: 'P', label: 'Phosphorus (P)', unit: 'kg/ha', step: 1 },
  { key: 'K', label: 'Potassium (K)', unit: 'kg/ha', step: 1 },
  { key: 'temperature', label: 'Temperature', unit: '°C', step: 0.1 },
  { key: 'humidity', label: 'Humidity', unit: '%', step: 0.1 },
  { key: 'ph', label: 'Soil pH', unit: '', step: 0.01 },
  { key: 'rainfall', label: 'Rainfall', unit: 'mm', step: 0.1 },
]

export const CROP_META = {
  rice: { emoji: '🌾', group: 'Cereal', blurb: 'Needs warm weather and plenty of water.' },
  maize: { emoji: '🌽', group: 'Cereal', blurb: 'Grows well in moderate rain and fertile soil.' },
  chickpea: { emoji: '🫘', group: 'Pulse', blurb: 'Prefers cooler, drier conditions.' },
  kidneybeans: { emoji: '🫘', group: 'Pulse', blurb: 'Likes cooler nights and well-drained soil.' },
  pigeonpeas: { emoji: '🫛', group: 'Pulse', blurb: 'Tolerant of heat and uneven rainfall.' },
  mothbeans: { emoji: '🌱', group: 'Pulse', blurb: 'Suited to arid, sandy soils.' },
  mungbean: { emoji: '🟢', group: 'Pulse', blurb: 'Short-season crop for warm, humid weather.' },
  blackgram: { emoji: '⚫', group: 'Pulse', blurb: 'Does well in warm, moderately wet climates.' },
  lentil: { emoji: '🥣', group: 'Pulse', blurb: 'Cool-season pulse with modest water needs.' },
  pomegranate: { emoji: '🍎', group: 'Fruit', blurb: 'Thrives in semi-arid, sunny regions.' },
  banana: { emoji: '🍌', group: 'Fruit', blurb: 'Needs heat, humidity, and rich potassium.' },
  mango: { emoji: '🥭', group: 'Fruit', blurb: 'Likes heat and a distinct dry spell.' },
  grapes: { emoji: '🍇', group: 'Fruit', blurb: 'Prefers dry air and potassium-rich soil.' },
  watermelon: { emoji: '🍉', group: 'Fruit', blurb: 'Hot weather and light, sandy soil.' },
  muskmelon: { emoji: '🍈', group: 'Fruit', blurb: 'Warm, dry harvest period works best.' },
  apple: { emoji: '🍏', group: 'Fruit', blurb: 'Cool climate with high humidity.' },
  orange: { emoji: '🍊', group: 'Fruit', blurb: 'Subtropical crop with steady moisture.' },
  papaya: { emoji: '🟠', group: 'Fruit', blurb: 'Tropical heat and regular rainfall.' },
  coconut: { emoji: '🥥', group: 'Fruit', blurb: 'Coastal humidity and heavy rainfall.' },
  cotton: { emoji: '☁️', group: 'Cash crop', blurb: 'Warm season with moderate rainfall.' },
  jute: { emoji: '🪢', group: 'Cash crop', blurb: 'Hot, humid, high-rainfall fibre crop.' },
  coffee: { emoji: '☕', group: 'Cash crop', blurb: 'Mild temperatures and high rainfall.' },
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function std(values, avg) {
  const v = mean(values.map((x) => (x - avg) ** 2))
  return Math.sqrt(v)
}

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const parts = line.split(',')
    const row = {}
    header.forEach((h, i) => {
      row[h] = h === 'label' ? parts[i] : Number(parts[i])
    })
    return row
  })
}

export function buildDataset(rows) {
  const keys = FEATURES.map((f) => f.key)
  const bounds = {}
  const defaults = {}

  for (const key of keys) {
    const vals = rows.map((r) => r[key])
    bounds[key] = { min: Math.min(...vals), max: Math.max(...vals) }
    defaults[key] = Number(mean(vals).toFixed(key === 'ph' ? 2 : 1))
  }

  const byCrop = {}
  for (const row of rows) {
    ;(byCrop[row.label] ||= []).push(row)
  }

  const profiles = Object.entries(byCrop)
    .map(([name, cropRows]) => {
      const stats = {}
      for (const key of keys) {
        const vals = cropRows.map((r) => r[key])
        const avg = mean(vals)
        stats[key] = {
          mean: avg,
          std: std(vals, avg),
          min: Math.min(...vals),
          max: Math.max(...vals),
        }
      }
      const meta = CROP_META[name] || { emoji: '🌿', group: 'Crop', blurb: '' }
      return { name, count: cropRows.length, stats, ...meta }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return { rows, bounds, defaults, profiles }
}

function featureScore(value, stat) {
  const s = Math.max(stat.std, 1e-6)
  const z = (value - stat.mean) / s
  return Math.exp(-0.5 * z * z)
}

export function recommendCrops(profiles, input) {
  return profiles
    .map((crop) => {
      const breakdown = FEATURES.map((f) => {
        const score = featureScore(input[f.key], crop.stats[f.key])
        return { key: f.key, label: f.label, score }
      })
      const match = breakdown.reduce((a, b) => a + b.score, 0) / breakdown.length
      return { ...crop, match, breakdown }
    })
    .sort((a, b) => b.match - a.match)
}

export const PRESETS = [
  {
    id: 'rice',
    name: 'Wet paddy',
    values: { N: 80, P: 47, K: 40, temperature: 24, humidity: 82, ph: 6.4, rainfall: 236 },
  },
  {
    id: 'chickpea',
    name: 'Cool pulse field',
    values: { N: 40, P: 68, K: 80, temperature: 18.9, humidity: 16.8, ph: 7.3, rainfall: 80 },
  },
  {
    id: 'watermelon',
    name: 'Hot melon patch',
    values: { N: 100, P: 17, K: 50, temperature: 25.6, humidity: 85, ph: 6.5, rainfall: 51 },
  },
  {
    id: 'coffee',
    name: 'Hill coffee plot',
    values: { N: 101, P: 29, K: 30, temperature: 25.5, humidity: 58.9, ph: 6.8, rainfall: 158 },
  },
]
