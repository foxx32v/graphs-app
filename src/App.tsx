import { useRef, useEffect, useState } from 'react'
import './App.css'
import type { VertexDTO } from './DTO/DTO'

function createGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = 10
  ctx.strokeStyle = '#fcfcfc'
  ctx.lineWidth = 0.1

  for (let x = 0; x <= w; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }

  for (let y = 0; y <= h; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

function App() {
  const cvsRef = useRef<HTMLCanvasElement>(null)
  const [isClose, setClose] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const [openMenu, setOpenMenu] = useState(false)
  const [vertexList, setVertexList] = useState<VertexDTO[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editX, setEditX] = useState('0')
  const [editY, setEditY] = useState('0')
  const [editR, setEditR] = useState('25')
  const [createMode, setCreateMode] = useState(false)
  const [edgeMode, setEdgeMode] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [edgeStart, setEdgeStart] = useState<number | null>(null)
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null)
  const dragMovedRef = useRef(false)
  const clickPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const countVertexRef = useRef(0)
  const [R, setRadius] = useState(25)

  useEffect(() => {
    const canvas = cvsRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    createGrid(ctx, canvas.width, canvas.height)
  }, [])

  const createVertex = (x: number, y: number) => {
    countVertexRef.current += 1
    const vertex: VertexDTO = {
      id: countVertexRef.current,
      x_pos: x,
      y_pos: y,
      title: `${countVertexRef.current}`,
      edge: [],
      radius: R,
    }
    setVertexList(prev => [...prev, vertex])
    setOpenMenu(false)
    
  }

  const saveVertex = (id: number) => {
    const parsedR = Number(editR)
    setVertexList(prev => prev.map(v => v.id === id ? {
      ...v,
      title: editTitle.trim() === '' ? v.title : editTitle,
      x_pos: Number(editX),
      y_pos: Number(editY),
      radius: parsedR > 0 ? parsedR : v.radius,
    } : v))
    setEditId(null)
    setEditTitle('')
  }

  const deleteVertex = (id: number) => {
    setVertexList(prev => prev
      .filter(v => v.id !== id)
      .map(v => ({ ...v, edge: (v.edge ?? []).filter(e => e !== id) }))
    )
    setSelectedId(null)
    setOpenMenu(false)
  }

  const deleteEdge = (from: number, to: number) => {
    setVertexList(prev => prev.map(v => {
      if (v.id === from) return { ...v, edge: (v.edge ?? []).filter(e => e !== to) }
      if (v.id === to) return { ...v, edge: (v.edge ?? []).filter(e => e !== from) }
      return v
    }))
  }

  const createEdge = (from: number, to: number) => {
    if (from === to) return
    setVertexList(prev => prev.map(v => {
      if (v.id === from) {
        const edges = v.edge ?? []
        return edges.includes(to) ? v : { ...v, edge: [...edges, to] }
      }
      if (v.id === to) {
        const edges = v.edge ?? []
        return edges.includes(from) ? v : { ...v, edge: [...edges, from] }
      }
      return v
    }))
  }

  const renderMenu = () => {
    if (!openMenu) return null
    return (
      <div
        className='createGraphMenu'
        style={{
          left: `${mousePos.x}px`,
          top: `${Number(mousePos.y || 0) + 5}px`,
        }}>
        <p className='textMenu'>Меню действий</p>
        <button className='changeActionButton' onClick={() => {
          if (clickPosRef.current) createVertex(clickPosRef.current.x, clickPosRef.current.y)
        }}>Создать вершину</button>
      </div>
    )
  }

  const onVertexPointerDown = (e: React.PointerEvent<SVGGElement>, v: VertexDTO) => {
    e.stopPropagation()
    if (deleteMode) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    dragRef.current = { id: v.id, dx: x - v.x_pos, dy: y - v.y_pos }
    dragMovedRef.current = false
    setOpenMenu(false)
    setSelectedId(v.id)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onVertexClick = (e: React.MouseEvent<SVGGElement>, v: VertexDTO) => {
    e.stopPropagation()
    if (deleteMode) {
      deleteVertex(v.id)
      return
    }
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    if (edgeMode) {
      if (edgeStart === null) {
        setEdgeStart(v.id)
        return
      }
      if (edgeStart === v.id) {
        setEdgeStart(null)
        return
      }
      createEdge(edgeStart, v.id)
      setEdgeStart(null)
      return
    }
    setSelectedId(prev => prev === v.id ? null : v.id)
  }

  const onGraphPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    dragMovedRef.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - drag.dx
    const y = e.clientY - rect.top - drag.dy
    setVertexList(prev => prev.map(v => v.id === drag.id ? { ...v, x_pos: x, y_pos: y } : v))
  }

  const onGraphPointerUp = () => {
    dragRef.current = null
  }

  const onGraphClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x_pos = e.clientX - rect.left
    const y_pos = e.clientY - rect.top
    setSelectedId(null)
    setMousePos({ x: x_pos, y: y_pos })
    clickPosRef.current = { x: x_pos, y: y_pos }
    if (deleteMode) return
    if (edgeMode) {
      setEdgeStart(null)
      return
    }
    if (createMode) {
      createVertex(x_pos, y_pos)
      return
    }
    setOpenMenu(prev => !prev)
  }

  const onEdgeClick = (e: React.MouseEvent<SVGLineElement>, from: number, to: number) => {
    e.stopPropagation()
    if (!deleteMode) return
    deleteEdge(from, to)
  }

  const toolbarCreate = () => {
    setSelectedId(null)
    setCreateMode(!createMode)
    setEdgeMode(false)
    setDeleteMode(false)
    setEdgeStart(null)
    setOpenMenu(false)
  }

  const toolbarEdit = () => {
    if (selectedId === null) return
    const v = vertexList.find(n => n.id === selectedId)
    if (!v) return
    setEditTitle(v.title ?? '')
    setEditX(String(v.x_pos.toFixed(0)))
    setEditY(String(v.y_pos.toFixed(0)))
    setEditR(String(v.radius ?? R))
    setEditId(selectedId)
  }

  const toolbarDelete = () => {
    setSelectedId(null)
    setDeleteMode(!deleteMode)
    setCreateMode(false)
    setEdgeMode(false)
    setEdgeStart(null)
    setOpenMenu(false)
  }

  const toolbarEdge = () => {
    setSelectedId(null)
    setEdgeMode(!edgeMode)
    setEdgeStart(null)
    setCreateMode(false)
    setDeleteMode(false)
    setOpenMenu(false)
  }

  const toolbarClear = () => {
    setSelectedId(null)
    setEdgeMode(false)
    setEdgeStart(null)
    setCreateMode(false)
    setDeleteMode(false)
    setOpenMenu(false)
  }

  const renderEdges = () => {
    const lines: any[] = []
    vertexList.forEach(v => {
      (v.edge ?? []).forEach(toId => {
        if (v.id >= toId) return
        const to = vertexList.find(n => n.id === toId)
        if (!to) return
        lines.push(
          <line
            key={`${v.id}-${toId}`}
            className='edge'
            x1={v.x_pos}
            y1={v.y_pos}
            x2={to.x_pos}
            y2={to.y_pos}
            onClick={(e) => onEdgeClick(e, v.id, toId)}
          />
        )
      })
    })
    return lines
  }

  const selected = vertexList.find(v => v.id === selectedId) ?? null

  return (
    <div id='mainBox'>
      {renderMenu()}
      <button
        id={isClose ? 'closeButtonO' : 'closeButtonC'}
        onClick={() => setClose(!isClose)}
      >=</button>
      <div id={isClose ? 'infoBoxOpen' : 'infoBoxClose'}>
        <div>
          <h2>Инфо:</h2>
          <p>координата x: {selected ? selected.x_pos.toFixed(0) : ''}</p>
          <p>координата y: {selected ? selected.y_pos.toFixed(0) : ''}</p>
          <p>количество связей: {selected ? selected.edge?.length : ''}</p>
          <p>имя вершины: {selected ? selected.title : ''}</p>
          <p>радиус: {selected ? selected.radius ?? R : ''}</p>
          <p>связи: {selected?.edge?.join(', ')}</p>
        </div>
        <hr />
        <div className='descriptionBox'>
          {vertexList.map(v =>
            <p
            className='textDescription' key={v.id}
            id={v.id == selectedId ? 'p': ''}
            onClick={() => setSelectedId(v.id)}>{`${v.id}: ${v.title}`}
            </p>
          )}
        </div>
      </div>
      <canvas
        ref={cvsRef}
        className='canvas'
      />
      <svg
        className='graph'
        onPointerMove={onGraphPointerMove}
        onPointerUp={onGraphPointerUp}
        onPointerLeave={onGraphPointerUp}
        onClick={onGraphClick}
      >
        {renderEdges()}
        {vertexList.map(v =>
          <g
            key={v.id}
            className={`vertex${selectedId === v.id ? 'Selected' : ''}${edgeStart === v.id ? ' EdgeStart' : ''}`}
            transform={`translate(${v.x_pos}, ${v.y_pos})`}
            onPointerDown={(e) => onVertexPointerDown(e, v)}
            onClick={(e) => onVertexClick(e, v)}
            style={{ cursor: 'grab' }}
          >
            <circle r={v.radius ?? R} />
            <text textAnchor='middle' dominantBaseline='middle'>
              {v.title ?? v.id}
            </text>
          </g>
        )}
      </svg>
      <div id='toolBar'>
        <p id='waterMark'>@ Редактор графов. Сделал: Дзвиник Александр, студент группы ПИ-16Д</p>
        <div className={`buttonsBox${isClose ? 'Open' : ''}`}>
          <button
            className={`toolbarButton`}
            onClick={toolbarClear}>-</button>
          <input
            className='renameInputR'
            type='number'
            value={R}
            placeholder='Радиус'
            onChange={(e) => setRadius(Number(e.target.value) || 25)}
          />
          <button
            className={`toolbarButton${createMode ? ' toolbarButtonActive' : ''}`}
            onClick={toolbarCreate}>+</button>
          <button
            className={`toolbarButton${edgeMode ? ' toolbarButtonActive' : ''}`}
            onClick={toolbarEdge}>🔗</button>
          <button
            className={`toolbarButton${selected ? ' toolbarButtonSelect' : ''}`}
            onClick={toolbarEdit}>⚙</button>
          <button
            className={`toolbarButton${deleteMode ? ' toolbarButtonActive' : ''}`}
            onClick={toolbarDelete}>🗑️</button>
        </div>
      </div>
      {editId !== null &&
        <div className='renameOverlay'>
          <div className='renameBox'>
            <h2>Редактировать</h2>
            <label className='editLabel'>Имя</label>
            <input
              className='renameInput'
              value={editTitle}
              autoFocus
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <label className='editLabel'>X</label>
            <input
              className='renameInput'
              type='number'
              value={editX}
              onChange={(e) => setEditX(e.target.value)}
            />
            <label className='editLabel'>Y</label>
            <input
              className='renameInput'
              type='number'
              value={editY}
              onChange={(e) => setEditY(e.target.value)}
            />
            <label className='editLabel'>Радиус</label>
            <input
              className='renameInput'
              type='number'
              value={editR}
              onChange={(e) => setEditR(e.target.value)}
            />
            <div className='renameButtons'>
              <button className='toolbarButton' onClick={() => saveVertex(editId)}>ОК</button>
              <button className='toolbarButton' onClick={() => setEditId(null)}>Отмена</button>
            </div>
          </div>
        </div>
      }
    </div>
  )
}

export default App