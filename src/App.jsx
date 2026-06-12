import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { Plus, Trash2, Edit3, CheckCircle2, ShoppingCart, Image as ImageIcon, RefreshCw } from 'lucide-react'

const CATEGORIES = [
  'Struktur',
  'Atap',
  'Pintu & Jendela',
  'Kelistrikan',
  'Plumbing',
  'Finishing',
  'Kayu & Hardware',
  'Peralatan & Operasional',
  'Lain-lain'
]

const STATUS = {
  buy: 'Belanja',
  arrived: 'Sudah datang'
}

const DEFAULT_PROJECT = 'Kos-kosan Palu'

export default function App() {
  const [project, setProject] = useState(null)
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT)
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewStatus, setViewStatus] = useState('Semua')
  const [viewCategory, setViewCategory] = useState('Semua')
  const [editingId, setEditingId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [form, setForm] = useState({
    nama_material: '',
    kategori: 'Struktur',
    qty: '',
    satuan: '',
    status: 'Belanja',
    catatan: ''
  })

  useEffect(() => {
    init()
  }, [])

  async function init() {
    setLoading(true)
    const { data: existing, error } = await supabase
      .from('projects')
      .select('*')
      .eq('nama_proyek', DEFAULT_PROJECT)
      .maybeSingle()

    if (error) {
      console.error(error)
      alert('Gagal membaca project. Cek RLS policy Supabase.')
      setLoading(false)
      return
    }

    let activeProject = existing
    if (!activeProject) {
      const { data: created, error: createError } = await supabase
        .from('projects')
        .insert({ nama_proyek: DEFAULT_PROJECT })
        .select()
        .single()

      if (createError) {
        console.error(createError)
        alert('Gagal membuat project. Cek policy insert Supabase.')
        setLoading(false)
        return
      }
      activeProject = created
    }

    setProject(activeProject)
    setProjectName(activeProject.nama_proyek)
    await loadMaterials(activeProject.id)
    setLoading(false)
  }

  async function loadMaterials(projectId = project?.id) {
    if (!projectId) return
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      alert('Gagal membaca material. Cek RLS policy Supabase.')
      return
    }

    setMaterials(data || [])
  }

  async function updateProjectName() {
    if (!project) return
    const clean = projectName.trim() || DEFAULT_PROJECT
    const { data, error } = await supabase
      .from('projects')
      .update({ nama_proyek: clean })
      .eq('id', project.id)
      .select()
      .single()

    if (error) {
      console.error(error)
      alert('Gagal update nama proyek.')
      return
    }
    setProject(data)
  }

  async function saveMaterial(e) {
    e.preventDefault()
    if (!form.nama_material.trim()) {
      alert('Nama material belum diisi.')
      return
    }

    setSaving(true)

    const payload = {
      project_id: project.id,
      nama_material: form.nama_material.trim(),
      kategori: form.kategori,
      qty: form.qty === '' ? null : Number(form.qty),
      satuan: form.satuan.trim(),
      status: form.status,
      catatan: form.catatan.trim()
    }

    let error
    if (editingId) {
      const result = await supabase.from('materials').update(payload).eq('id', editingId)
      error = result.error
    } else {
      const result = await supabase.from('materials').insert(payload)
      error = result.error
    }

    if (error) {
      console.error(error)
      alert('Gagal menyimpan material. Cek policy insert/update Supabase.')
      setSaving(false)
      return
    }

    resetForm()
    await loadMaterials()
    setSaving(false)
  }

  function resetForm() {
    setEditingId(null)
    setForm({
      nama_material: '',
      kategori: 'Struktur',
      qty: '',
      satuan: '',
      status: 'Belanja',
      catatan: ''
    })
  }

  function editMaterial(item) {
    setEditingId(item.id)
    setForm({
      nama_material: item.nama_material || '',
      kategori: item.kategori || 'Lain-lain',
      qty: item.qty ?? '',
      satuan: item.satuan || '',
      status: item.status || 'Belanja',
      catatan: item.catatan || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteMaterial(id) {
    if (!confirm('Hapus material ini?')) return

    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Gagal hapus material.')
      return
    }

    await loadMaterials()
  }

  async function changeStatus(id, status) {
    const { error } = await supabase.from('materials').update({ status }).eq('id', id)
    if (error) {
      console.error(error)
      alert('Gagal ubah status.')
      return
    }

    await loadMaterials()
  }

  async function seedSample() {
    if (!project) return
    const rows = [
      { project_id: project.id, nama_material: 'Semen PCC', kategori: 'Struktur', qty: 50, satuan: 'zak', status: 'Belanja', catatan: '' },
      { project_id: project.id, nama_material: 'Baja ringan C75', kategori: 'Atap', qty: 20, satuan: 'btg', status: 'Belanja', catatan: '' },
      { project_id: project.id, nama_material: 'Lampu LED 45 Watt', kategori: 'Kelistrikan', qty: 7, satuan: 'bh', status: 'Belanja', catatan: '' },
      { project_id: project.id, nama_material: 'Pipa 3/4', kategori: 'Plumbing', qty: 10, satuan: 'bh', status: 'Sudah datang', catatan: '' },
      { project_id: project.id, nama_material: 'Cat tembok', kategori: 'Finishing', qty: 2, satuan: 'pail', status: 'Belanja', catatan: '' }
    ]

    const { error } = await supabase.from('materials').insert(rows)
    if (error) {
      console.error(error)
      alert('Gagal isi contoh.')
      return
    }

    await loadMaterials()
  }

  const filtered = useMemo(() => {
    return materials.filter(item => {
      const okStatus = viewStatus === 'Semua' || item.status === viewStatus
      const okCat = viewCategory === 'Semua' || item.kategori === viewCategory
      return okStatus && okCat
    })
  }, [materials, viewStatus, viewCategory])

  const grouped = useMemo(() => {
    return filtered.reduce((acc, item) => {
      const key = item.kategori || 'Lain-lain'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})
  }, [filtered])

  const countBuy = materials.filter(x => x.status === 'Belanja').length
  const countArrived = materials.filter(x => x.status === 'Sudah datang').length
  const progress = materials.length ? Math.round((countArrived / materials.length) * 100) : 0

  function buildText() {
    const lines = []
    lines.push('*Daftar Belanja Material*')
    lines.push(`*Proyek*: ${projectName || '-'}`)
    lines.push(`*Tanggal*: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    lines.push(`*Progress*: ${progress}% sudah datang`)
    Object.entries(grouped).forEach(([cat, items]) => {
      lines.push('')
      lines.push(`*${cat}*`)
      items.forEach(item => {
        const icon = item.status === 'Sudah datang' ? '✅' : '☐'
        lines.push(`${icon} ${item.nama_material} — ${item.qty ?? ''} ${item.satuan || ''}${item.catatan ? ` (${item.catatan})` : ''} - ${item.status}`)
      })
    })
    return lines.join('\n')
  }

  async function copyText() {
    await navigator.clipboard.writeText(buildText())
    alert('Sudah dicopy. Siap paste ke WhatsApp/Notion.')
  }

  if (loading) {
    return (
      <main className="wrap">
        <div className="loading">
          <RefreshCw className="spin" size={22} />
          <b>Memuat data dari Supabase...</b>
        </div>
      </main>
    )
  }

  return (
    <main className="wrap">
      <section className="top">
        <h1>Daftar Belanja Material</h1>
        <p>Data tersimpan di Supabase. Bisa sinkron dari HP dan laptop.</p>
      </section>

      <section className="card form-card">
        <div className="grid">
          <label>
            Nama Proyek
            <input value={projectName} onChange={e => setProjectName(e.target.value)} onBlur={updateProjectName} />
          </label>
          <label>
            Tanggal
            <input value={new Date().toLocaleDateString('id-ID')} disabled />
          </label>
        </div>
      </section>

      <form className="card form-card" onSubmit={saveMaterial}>
        <div className="grid">
          <label>
            Nama Material
            <input value={form.nama_material} onChange={e => setForm({ ...form, nama_material: e.target.value })} placeholder="Contoh: Lampu LED 45 Watt" />
          </label>
          <label>
            Kategori
            <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <div className="grid3">
          <label>
            Jumlah
            <input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} placeholder="Contoh: 7" />
          </label>
          <label>
            Satuan
            <input value={form.satuan} onChange={e => setForm({ ...form, satuan: e.target.value })} placeholder="bh/roll/unit" />
          </label>
          <label>
            Status
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option>Belanja</option>
              <option>Sudah datang</option>
            </select>
          </label>
        </div>

        <label>
          Catatan Item
          <input value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} placeholder="Contoh: urgent / merk bebas / kurang" />
        </label>

        <div className="btns">
          <button className="primary" disabled={saving}>
            <Plus size={16} />
            {editingId ? 'Update Material' : 'Simpan Material'}
          </button>
          {editingId && <button type="button" className="ghost" onClick={resetForm}>Batal Edit</button>}
          <button type="button" className="ghost" onClick={seedSample}>Isi Contoh</button>
        </div>
      </form>

      <section className="summary">
        <div className="box"><b>{materials.length}</b><span>Total Item</span></div>
        <div className="box"><b>{countBuy}</b><span>Belanja</span></div>
        <div className="box"><b>{countArrived}</b><span>Sudah Datang</span></div>
        <div className="box"><b>{progress}%</b><span>Progress</span></div>
      </section>

      <section className="tabs">
        {['Semua', 'Belanja', 'Sudah datang'].map(s => (
          <button key={s} className={viewStatus === s ? 'active' : ''} onClick={() => setViewStatus(s)}>{s}</button>
        ))}
      </section>

      <section className="tabs">
        {['Semua', ...CATEGORIES].map(c => (
          <button key={c} className={viewCategory === c ? 'active' : ''} onClick={() => setViewCategory(c)}>{c}</button>
        ))}
      </section>

      <section className="list">
        {filtered.length === 0 ? (
          <div className="card empty">Belum ada data. Tambahkan material pertama.</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2>{cat}</h2>
              <div className="card">
                {items.map(item => (
                  <article key={item.id} className={`item ${item.status === 'Sudah datang' ? 'done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={item.status === 'Sudah datang'}
                      onChange={e => changeStatus(item.id, e.target.checked ? 'Sudah datang' : 'Belanja')}
                    />
                    <div className="item-body">
                      <div className="item-title">{item.nama_material} — {item.qty ?? ''} {item.satuan}</div>
                      {item.catatan && <div className="note">{item.catatan}</div>}
                      <span className={`pill ${item.status === 'Sudah datang' ? 'green' : 'blue'}`}>
                        {item.status === 'Sudah datang' ? <CheckCircle2 size={13} /> : <ShoppingCart size={13} />}
                        {item.status}
                      </span>
                      <div className="actions">
                        <button onClick={() => changeStatus(item.id, 'Belanja')}>Belanja</button>
                        <button onClick={() => changeStatus(item.id, 'Sudah datang')}>Sudah datang</button>
                        <button onClick={() => editMaterial(item)}><Edit3 size={13} /> Edit</button>
                        <button className="danger" onClick={() => deleteMaterial(item.id)}><Trash2 size={13} /> Hapus</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <footer className="floating">
        <button onClick={copyText}>Copy WA/Notion</button>
        <button onClick={() => setPreviewOpen(true)}><ImageIcon size={16} /> Preview Klien</button>
        <button className="primary" onClick={() => window.print()}>Simpan PDF/Gambar</button>
      </footer>

      {previewOpen && (
        <div className="modal">
          <div className="modal-card">
            <div className="client-preview">
              <h1>Daftar Belanja Material</h1>
              <p><b>Proyek:</b> {projectName}</p>
              <p><b>Tanggal:</b> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><b>Progress:</b> {progress}% material sudah datang</p>

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <h2>{cat}</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Material</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>{item.nama_material}</td>
                          <td>{item.qty ?? ''} {item.satuan}</td>
                          <td>{item.status}</td>
                          <td>{item.catatan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div className="btns no-print">
              <button className="primary" onClick={() => window.print()}>Simpan PDF / Screenshot</button>
              <button onClick={() => setPreviewOpen(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
