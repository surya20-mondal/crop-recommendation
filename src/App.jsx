import { useEffect, useMemo, useState } from 'react'
import {
  FEATURES,
  PRESETS,
  buildDataset,
  parseCsv,
} from './lib/cropData'

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'recommend', label: 'Recommend' },
  { id: 'crops', label: 'Crops' },
  { id: 'dataset', label: 'Dataset' },
]

function format(n, key) {
  if (key === 'ph') return Number(n).toFixed(2)
  if (['temperature', 'humidity', 'rainfall'].includes(key)) return Number(n).toFixed(1)
  return Math.round(n)
}

export default function App() {
  const [page, setPage] = useState('home')
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [input, setInput] = useState(null)
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [cropFilter, setCropFilter] = useState('all')
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    fetch('/Crop_recommendation.csv')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load Crop_recommendation.csv')
        return res.text()
      })
      .then((text) => {
        const built = buildDataset(parseCsv(text))
        setData(built)
        setInput(built.defaults)
      })
      .catch((err) => setError(err.message))
  }, [])

  const filteredRows = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.rows.filter((row) => {
      const cropOk = cropFilter === 'all' || row.label === cropFilter
      const textOk = !q || row.label.includes(q)
      return cropOk && textOk
    })
  }, [data, query, cropFilter])

  const pageSize = 15
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visibleRows = filteredRows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)

  useEffect(() => {
    setPageIndex(0)
  }, [query, cropFilter])


async function runRecommend(values = input) {
  if (!data || !values) return

  try {
    const response = await fetch('https://crop-recommendation-4t6w.onrender.com/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    })

    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.error || 'Prediction failed')
    }

    const mappedResults = payload.top_crops
      .map((item) => {
        const profile = data.profiles.find(
          (crop) => crop.name.toLowerCase() === item.crop.toLowerCase()
        )

        if (!profile) return null

        return {
          ...profile,
          match: item.probability,
          breakdown: [],
        }
      })
      .filter(Boolean)

    setResults(mappedResults)
    setPage('recommend')
  } catch (err) {
    console.error('ML prediction error:', err)
    alert(`Could not get prediction: ${err.message}`)
  }
}


  if (error) {
    return (
      <div className="app">
        <div className="banner">{error}. Put the CSV in the public folder and refresh.</div>
      </div>
    )
  }

  if (!data || !input) {
    return (
      <div className="app">
        <p className="muted">Loading crop dataset…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="nav">
        <div className="brand">
          <div className="mark">🌿</div>
          <div>KrishiChoice</div>
        </div>
        <nav className="nav-links">
          {PAGES.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {page === 'home' && (
        <>
          <section className="hero">
            <div>
              <p className="kicker">College project · AI/ML powered</p>
              <h1>Recommend the right crop from soil and weather.</h1>
              <p className="lede">
                  KrishiChoice uses a trained Machine Learning model to recommend suitable crops.
                  Enter N, P, K, temperature, humidity, pH and rainfall to get the top 5 crop
                  recommendations based on your soil and weather conditions.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => setPage('recommend')}>
                  Get a recommendation
                </button>
                <button className="ghost" onClick={() => setPage('crops')}>
                  Browse 22 crops
                </button>
              </div>
            </div>
            <div className="hero-card">
              <div className="stat-grid">
                <div className="stat">
                  <b>{data.rows.length}</b>
                  samples
                </div>
                <div className="stat">
                  <b>{data.profiles.length}</b>
                  crops
                </div>
                <div className="stat">
                  <b>7</b>
                  features
                </div>
              </div>
              <p className="muted" style={{ marginTop: 16 }}>
                Dataset columns: N, P, K, temperature, humidity, ph, rainfall, label.
                Each crop has 100 labelled samples.
              </p>
            </div>
          </section>

          <section className="section">
            <h2>How it works</h2>
            <p className="muted">Crop recommendations powered by a trained Machine Learning model.</p>
            <div className="grid-3">
              <article className="step panel">
                <span>1</span>
                <h3>Load the CSV</h3>
                <p className="muted">The app loads crop data from Crop_recommendation.csv to display crop information.</p>
              </article>
              <article className="step panel">
                <span>2</span>
                <h3>Enter field values</h3>
                <p className="muted">Use sliders or a demo preset that matches a typical field from the dataset.</p>
              </article>
              <article className="step panel">
                <span>3</span>
                <h3>Rank the crops</h3>
                <p className="muted">The trained Gaussian Naive Bayes model analyses your inputs and predicts the most suitable crops.</p>
              </article>
            </div>
          </section>
        </>
      )}

      {page === 'recommend' && (
        <section className="section">
          <h2>Crop recommendation</h2>
          <p className="muted">Move the sliders to match your field. Scores compare your values to each crop’s samples.</p>
          <div className="form-grid">
            <div className="controls panel">
              <strong>Demo presets</strong>
              <div className="presets">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setInput(preset.values)
                      runRecommend(preset.values)
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              {FEATURES.map((feature) => (
                <div className="field" key={feature.key}>
                  <label>
                    <span>{feature.label}</span>
                    <span>
                      {format(input[feature.key], feature.key)} {feature.unit}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={data.bounds[feature.key].min}
                    max={data.bounds[feature.key].max}
                    step={feature.step}
                    value={input[feature.key]}
                    onChange={(e) =>
                      setInput((prev) => ({ ...prev, [feature.key]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
              <button className="primary wide" onClick={() => runRecommend()}>
                Recommend crops
              </button>
            </div>
            <div className="results">
              {results.length === 0 ? (
                <div className="panel" style={{ padding: 22 }}>
                  <h3>No ranking yet</h3>
                  <p className="muted">Submit the form or pick a preset to see the top 5 matches.</p>
                </div>
              ) : (
                results.map((crop, index) => (
                  <article className="result-card" key={crop.name}>
                    <div className="result-head">
                      <div>
                        <span className="badge">#{index + 1} · {crop.group}</span>
                        <h3>
                          {crop.emoji} {crop.name}
                        </h3>
                        <p className="muted">{crop.blurb}</p>
                      </div>
                      <b>{Math.round(crop.match * 100)}%</b>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${Math.round(crop.match * 100)}%` }} />
                    </div>
                    <div className="mini">
                      {crop.breakdown.map((item) => (
                        <div className="mini-row" key={item.key}>
                          <span>{item.label}</span>
                          <div className="bar">
                            <i style={{ width: `${Math.round(item.score * 100)}%` }} />
                          </div>
                          <b>{Math.round(item.score * 100)}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {page === 'crops' && (
        <section className="section">
          <h2>Crops in the dataset</h2>
          <p className="muted">Typical ranges learned from 100 samples per crop.</p>
          <div className="crops">
            {data.profiles.map((crop) => (
              <article className="crop-card" key={crop.name}>
                <span className="badge">{crop.group}</span>
                <h3>
                  {crop.emoji} {crop.name}
                </h3>
                <p className="muted">{crop.blurb}</p>
                <p className="range">
                  N {format(crop.stats.N.min, 'N')}–{format(crop.stats.N.max, 'N')} · P{' '}
                  {format(crop.stats.P.min, 'P')}–{format(crop.stats.P.max, 'P')} · K{' '}
                  {format(crop.stats.K.min, 'K')}–{format(crop.stats.K.max, 'K')}
                  <br />
                  {format(crop.stats.temperature.min, 'temperature')}–{format(crop.stats.temperature.max, 'temperature')}°C ·{' '}
                  {format(crop.stats.humidity.min, 'humidity')}–{format(crop.stats.humidity.max, 'humidity')}% humidity
                  <br />
                  pH {format(crop.stats.ph.min, 'ph')}–{format(crop.stats.ph.max, 'ph')} · rain{' '}
                  {format(crop.stats.rainfall.min, 'rainfall')}–{format(crop.stats.rainfall.max, 'rainfall')} mm
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {page === 'dataset' && (
        <section className="section">
          <h2>Explore samples</h2>
          <p className="muted">{filteredRows.length} rows from Crop_recommendation.csv</p>
          <div className="toolbar">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search crop name"
            />
            <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
              <option value="all">All crops</option>
              {data.profiles.map((crop) => (
                <option key={crop.name} value={crop.name}>
                  {crop.name}
                </option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Crop</th>
                  {FEATURES.map((f) => (
                    <th key={f.key}>{f.key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr key={`${row.label}-${pageIndex}-${i}`}>
                    <td>{row.label}</td>
                    {FEATURES.map((f) => (
                      <td key={f.key}>{format(row[f.key], f.key)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="ghost" disabled={pageIndex === 0} onClick={() => setPageIndex((p) => p - 1)}>
              Previous
            </button>
            <span className="muted">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <button
              className="ghost"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPageIndex((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      <footer className="footer">
        Frontend-only college project using Crop_recommendation.csv · 2200 samples · 22 crops
      </footer>
    </div>
  )
}
