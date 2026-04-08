import { useState, useRef } from 'react'
import './App.css'

interface Person {
  id: number
  name: string
}

interface Item {
  id: number
  name: string
  price: string
  assignedTo: number[]
}

function App() {
  const [people, setPeople] = useState<Person[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [tip, setTip] = useState('')
  const [tax, setTax] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addPerson = () => {
    if (!newPersonName.trim()) return
    setPeople([...people, { id: Date.now(), name: newPersonName.trim() }])
    setNewPersonName('')
  }

  const removePerson = (id: number) => {
    setPeople(people.filter(p => p.id !== id))
    setItems(items.map(item => ({
      ...item,
      assignedTo: item.assignedTo.filter(pid => pid !== id)
    })))
  }

  const removeItem = (id: number) => {
    setItems(items.filter(i => i.id !== id))
  }

  const toggleAssignment = (itemId: number, personId: number) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item
      const assigned = item.assignedTo.includes(personId)
        ? item.assignedTo.filter(id => id !== personId)
        : [...item.assignedTo, personId]
      return { ...item, assignedTo: assigned }
    }))
  }

  const assignAll = (itemId: number) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item
      const allAssigned = people.every(p => item.assignedTo.includes(p.id))
      return {
        ...item,
        assignedTo: allAssigned ? [] : people.map(p => p.id)
      }
    }))
  }

  const handleScan = async (file: File) => {
    setScanning(true)
    setScanError('')
    setPreviewUrl(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append('receipt', file)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setScanError(data.error || 'Failed to scan receipt')
        return
      }

      if (data.items && Array.isArray(data.items)) {
        const scannedItems: Item[] = data.items.map((item: any, i: number) => ({
          id: Date.now() + i,
          name: item.name || 'Unknown item',
          price: String(item.price || 0),
          assignedTo: []
        }))
        setItems(scannedItems)
      }

      if (data.tax) setTax(String(data.tax))
      if (data.tip) setTip(String(data.tip))
    } catch {
      setScanError('Failed to connect to scanning service')
    } finally {
      setScanning(false)
    }
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleScan(file)
  }

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
  const taxAmount = parseFloat(tax) || 0
  const tipAmount = parseFloat(tip) || 0
  const total = subtotal + taxAmount + tipAmount
  const multiplier = subtotal > 0 ? total / subtotal : 1

  const getPersonTotal = (personId: number) => {
    let personSubtotal = 0
    items.forEach(item => {
      if (item.assignedTo.includes(personId) && item.assignedTo.length > 0) {
        personSubtotal += (parseFloat(item.price) || 0) / item.assignedTo.length
      }
    })
    return personSubtotal * multiplier
  }

  return (
    <div className="app">
      <h1>Receipt Splitter</h1>

      <section className="section scan-section">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileSelect}
          hidden
        />
        <button
          className="scan-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Scan Receipt'}
        </button>
        {scanError && <p className="error">{scanError}</p>}
        {previewUrl && (
          <div className="preview">
            <img src={previewUrl} alt="Receipt" />
          </div>
        )}
      </section>

      <section className="section">
        <h2>People</h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Name"
            value={newPersonName}
            onChange={e => setNewPersonName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
          />
          <button onClick={addPerson}>Add</button>
        </div>
        <div className="tags">
          {people.map(person => (
            <span key={person.id} className="tag">
              {person.name}
              <button className="tag-remove" onClick={() => removePerson(person.id)}>&times;</button>
            </span>
          ))}
        </div>
      </section>

      {items.length > 0 && (
        <section className="section">
          <h2>Items</h2>
          <div className="table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  {people.map(p => <th key={p.id}>{p.name}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>&pound;{(parseFloat(item.price) || 0).toFixed(2)}</td>
                    {people.map(person => (
                      <td key={person.id} className="check-cell">
                        <input
                          type="checkbox"
                          checked={item.assignedTo.includes(person.id)}
                          onChange={() => toggleAssignment(item.id, person.id)}
                        />
                      </td>
                    ))}
                    <td className="action-cell">
                      {people.length > 0 && (
                        <button
                          className="btn-all"
                          onClick={() => assignAll(item.id)}
                          title="Toggle all"
                        >
                          all
                        </button>
                      )}
                      <button className="btn-remove" onClick={() => removeItem(item.id)}>&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="extras-row">
            <label>
              Tax: &pound;
              <input
                type="number"
                value={tax}
                onChange={e => setTax(e.target.value)}
                step="0.01"
                min="0"
              />
            </label>
            <label>
              Tip: &pound;
              <input
                type="number"
                value={tip}
                onChange={e => setTip(e.target.value)}
                step="0.01"
                min="0"
              />
            </label>
          </div>
        </section>
      )}

      {items.length > 0 && people.length > 0 && (
        <section className="section summary">
          <h2>Summary</h2>
          <div className="summary-line">
            <span>Subtotal</span>
            <span>&pound;{subtotal.toFixed(2)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="summary-line">
              <span>Tax</span>
              <span>&pound;{taxAmount.toFixed(2)}</span>
            </div>
          )}
          {tipAmount > 0 && (
            <div className="summary-line">
              <span>Tip</span>
              <span>&pound;{tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="summary-line total">
            <span>Total</span>
            <span>&pound;{total.toFixed(2)}</span>
          </div>
          <hr />
          <h3>Each person owes:</h3>
          {people.map(person => {
            const owes = getPersonTotal(person.id)
            return (
              <div key={person.id} className="summary-line">
                <span>{person.name}</span>
                <span>&pound;{owes.toFixed(2)}</span>
              </div>
            )
          })}
          {(() => {
            const assigned = items.reduce((sum, item) => {
              if (item.assignedTo.length > 0) return sum + (parseFloat(item.price) || 0)
              return sum
            }, 0)
            const unassigned = subtotal - assigned
            return unassigned > 0 ? (
              <div className="summary-line unassigned">
                <span>Unassigned</span>
                <span>&pound;{(unassigned * multiplier).toFixed(2)}</span>
              </div>
            ) : null
          })()}
        </section>
      )}
    </div>
  )
}

export default App
