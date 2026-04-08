import { useState } from 'react'
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
  const [people, setPeople] = useState<Person[]>([
    { id: 1, name: 'Person 1' },
    { id: 2, name: 'Person 2' },
  ])
  const [items, setItems] = useState<Item[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [tip, setTip] = useState('')
  const [tax, setTax] = useState('')

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

  const addItem = () => {
    if (!newItemName.trim() || !newItemPrice) return
    setItems([...items, {
      id: Date.now(),
      name: newItemName.trim(),
      price: newItemPrice,
      assignedTo: []
    }])
    setNewItemName('')
    setNewItemPrice('')
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

      <section className="section">
        <h2>Items</h2>
        <div className="input-row">
          <input
            type="text"
            placeholder="Item name"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Price"
            value={newItemPrice}
            onChange={e => setNewItemPrice(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            step="0.01"
            min="0"
          />
          <button onClick={addItem}>Add</button>
        </div>

        {items.length > 0 && (
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
                    <td>
                      <button className="btn-remove" onClick={() => removeItem(item.id)}>&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Extras</h2>
        <div className="input-row">
          <label>
            Tax
            <input
              type="number"
              placeholder="0.00"
              value={tax}
              onChange={e => setTax(e.target.value)}
              step="0.01"
              min="0"
            />
          </label>
          <label>
            Tip
            <input
              type="number"
              placeholder="0.00"
              value={tip}
              onChange={e => setTip(e.target.value)}
              step="0.01"
              min="0"
            />
          </label>
        </div>
      </section>

      {items.length > 0 && (
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
          {people.map(person => (
            <div key={person.id} className="summary-line">
              <span>{person.name}</span>
              <span>&pound;{getPersonTotal(person.id).toFixed(2)}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export default App
