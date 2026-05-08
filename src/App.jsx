import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'

const markerIcon = new L.DivIcon({
  className: 'route-marker',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const depotOrigin = '39.860985941591984,4.26217301603865'
const lastAssignmentStorageKey = 'driver-route-last-assignment'

const demoCsv = `driver,truck,name,address,city,notes
Joan,Truck 1,Hotel Xuroy,Carrer Llevant 2,Alcalfar,Organic waste
Joan,Truck 1,Restaurant Sa Llagosta,Carrer des Port 10,Fornells,Glass pickup
Joan,Truck 1,Hotel Port Mahon,Avinguda Port de Mao 14,Mao,Kitchen oil drums
Pere,Truck 2,Hotel Cala Galdana,Avinguda Cala Galdana,Cala Galdana,Plastic containers
Pere,Truck 2,Supermercat Ferreries,Carrer Major 44,Ferreries,Cardboard pickup
Pere,Truck 2,Restaurant Es Brucs,Carrer des Tamarells 5,Son Bou,Mixed recyclables`

const menorcaCoordinates = {
  alcalfar: [39.8259, 4.2908],
  fornells: [40.0416, 4.1325],
  mao: [39.8885, 4.2658],
  'cala galdana': [39.9378, 3.9605],
  ferreries: [39.9838, 4.0096],
  'son bou': [39.8947, 4.0702],
}

function parseCsv(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const headers = lines[0].split(',').map((header) => header.trim().toLowerCase())

  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim())
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? '']))
    const cityKey = row.city.toLowerCase()
    const coordinates = menorcaCoordinates[cityKey] ?? [39.9496, 4.1106]

    return {
      id: `${row.driver}-${row.truck}-${index}`,
      driver: row.driver,
      truck: row.truck,
      name: row.name,
      address: row.address,
      city: row.city,
      notes: row.notes,
      coordinates,
    }
  })
}

function buildAssignments(stops) {
  const assignments = new Map()

  stops.forEach((stop) => {
    const key = `${stop.driver}__${stop.truck}`
    const existing = assignments.get(key)

    if (existing) {
      existing.stops.push(stop)
      return
    }

    assignments.set(key, {
      id: key,
      driver: stop.driver,
      truck: stop.truck,
      stops: [stop],
    })
  })

  return Array.from(assignments.values())
}

function getRouteLink(stops) {
  if (!stops.length) {
    return '#'
  }

  const destinations = stops.map((stop) =>
    encodeURIComponent(`${stop.address}, ${stop.city}, Menorca, Spain`),
  )
  const origin = encodeURIComponent(depotOrigin)

  if (destinations.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destinations[0]}&travelmode=driving`
  }

  const destination = destinations[destinations.length - 1]
  const waypoints = destinations.slice(0, -1).join('|')

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving&waypoints=${waypoints}`
}

function App() {
  const [stops, setStops] = useState(() => parseCsv(demoCsv))
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [completedStops, setCompletedStops] = useState({})
  const [driverQuery, setDriverQuery] = useState('')
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  const assignments = useMemo(() => buildAssignments(stops), [stops])
  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  )
  const filteredAssignments = useMemo(() => {
    const query = driverQuery.trim().toLowerCase()

    if (!query) {
      return assignments
    }

    return assignments.filter((assignment) =>
      `${assignment.driver} ${assignment.truck}`.toLowerCase().includes(query),
    )
  }, [assignments, driverQuery])
  const lastAssignment = useMemo(
    () =>
      assignments.find(
        (assignment) => assignment.id === window.localStorage.getItem(lastAssignmentStorageKey),
      ) ?? null,
    [assignments],
  )

  useEffect(() => {
    if (!assignments.length) {
      setSelectedAssignmentId('')
      return
    }

    const selectionStillExists = assignments.some((assignment) => assignment.id === selectedAssignmentId)
    if (!selectionStillExists) {
      setSelectedAssignmentId('')
    }
  }, [assignments, selectedAssignmentId])

  useEffect(() => {
    if (!selectedAssignmentId) {
      return
    }

    window.localStorage.setItem(lastAssignmentStorageKey, selectedAssignmentId)
  }, [selectedAssignmentId])

  function handleCsvUpload(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const uploadedStops = parseCsv(String(reader.result ?? ''))
      setStops(uploadedStops)
      setCompletedStops({})
      setSelectedAssignmentId('')
      setDriverQuery('')
      setShowAdminPanel(false)
    }
    reader.readAsText(file)
  }

  function toggleStopCompletion(stopId) {
    setCompletedStops((current) => ({
      ...current,
      [stopId]: !current[stopId],
    }))
  }

  const routeStops = selectedAssignment?.stops ?? []
  const completedCount = routeStops.filter((stop) => completedStops[stop.id]).length
  const mapCenter = routeStops[0]?.coordinates ?? [39.9496, 4.1106]

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Menorca Driver Route</p>
          <h1>Your route, ready in one tap.</h1>
          <p className="hero-copy">Choose driver and truck. See only your stops. Start driving.</p>
        </div>

        {!selectedAssignment && (
          <section className="admin-panel compact">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setShowAdminPanel((current) => !current)}
            >
              {showAdminPanel ? 'Hide admin tools' : 'Admin / demo tools'}
            </button>

            {showAdminPanel && (
              <div className="admin-panel-body">
                <p className="panel-label">Office Upload</p>
                <p className="admin-copy">CSV columns: driver, truck, name, address, city, notes</p>
                <label className="upload-field">
                  <span>Upload routes CSV</span>
                  <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} />
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setStops(parseCsv(demoCsv))
                    setCompletedStops({})
                    setSelectedAssignmentId('')
                    setDriverQuery('')
                    setShowAdminPanel(false)
                  }}
                >
                  Reload demo data
                </button>
              </div>
            )}
          </section>
        )}
      </header>

      {!selectedAssignment ? (
        <main className="selection-screen">
          <section className="selection-card">
            <div className="selection-header">
              <div>
                <p className="panel-label">Start Route</p>
                <h2>Select driver / truck</h2>
              </div>
              <div className="selection-meta">
                <strong>{assignments.length}</strong>
                <span>routes today</span>
              </div>
            </div>

            {lastAssignment && (
              <button
                className="continue-card"
                type="button"
                onClick={() => setSelectedAssignmentId(lastAssignment.id)}
              >
                <span className="continue-label">Continue last route</span>
                <strong>
                  {lastAssignment.driver} · {lastAssignment.truck}
                </strong>
                <small>{lastAssignment.stops.length} stops ready</small>
              </button>
            )}

            <label className="search-field">
              <span>Find your route</span>
              <input
                type="search"
                placeholder="Search driver or truck"
                value={driverQuery}
                onChange={(event) => setDriverQuery(event.target.value)}
              />
            </label>

            <div className="assignment-list">
              {filteredAssignments.map((assignment) => (
                <button
                  key={assignment.id}
                  className="assignment-button"
                  type="button"
                  onClick={() => setSelectedAssignmentId(assignment.id)}
                >
                  <div className="assignment-main">
                    <strong>{assignment.driver}</strong>
                    <span>{assignment.truck}</span>
                  </div>
                  <small>{assignment.stops.length} stops</small>
                </button>
              ))}
            </div>

            {!filteredAssignments.length && (
              <p className="empty-state">No route matches that driver or truck.</p>
            )}
          </section>
        </main>
      ) : (
        <main className="route-screen">
          <section className="route-summary">
            <div>
              <p className="panel-label">Today</p>
              <h2>{selectedAssignment.driver}</h2>
              <p className="summary-line">{selectedAssignment.truck}</p>
            </div>

            <div className="summary-grid">
              <article>
                <span>Stops</span>
                <strong>{routeStops.length}</strong>
              </article>
              <article>
                <span>Completed</span>
                <strong>{completedCount}</strong>
              </article>
              <article>
                <span>Pending</span>
                <strong>{routeStops.length - completedCount}</strong>
              </article>
            </div>

            <div className="summary-actions">
              <a
                className="primary-button"
                href={getRouteLink(routeStops)}
                target="_blank"
                rel="noreferrer"
              >
                Open route in Google Maps
              </a>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setSelectedAssignmentId('')
                  setDriverQuery('')
                }}
              >
                Change driver
              </button>
            </div>
          </section>

          <section className="map-panel">
            <div className="map-header">
              <h3>Stops map</h3>
              <p>Depot to assigned stops only.</p>
            </div>
            <MapContainer center={mapCenter} zoom={11} scrollWheelZoom={false} className="route-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {routeStops.map((stop, index) => (
                <Marker key={stop.id} position={stop.coordinates} icon={markerIcon}>
                  <Popup>
                    {index + 1}. {stop.name}
                    <br />
                    {stop.address}, {stop.city}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </section>

          <section className="stop-list-panel">
            <div className="map-header">
              <h3>Stop list</h3>
              <p>Tap each stop when finished.</p>
            </div>

            <div className="stop-list">
              {routeStops.map((stop, index) => {
                const completed = Boolean(completedStops[stop.id])

                return (
                  <article key={stop.id} className={`stop-card ${completed ? 'is-completed' : ''}`}>
                    <div className="stop-card-header">
                      <div>
                        <span className="stop-number">Stop {index + 1}</span>
                        <h4>{stop.name}</h4>
                      </div>
                      <span className={`status-badge ${completed ? 'done' : 'pending'}`}>
                        {completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>

                    <p>{stop.address}</p>
                    <p>{stop.city}</p>
                    <p className="stop-notes">{stop.notes}</p>

                    <button
                      className={completed ? 'secondary-button' : 'primary-button'}
                      type="button"
                      onClick={() => toggleStopCompletion(stop.id)}
                    >
                      {completed ? 'Mark as pending' : 'Mark as completed'}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
