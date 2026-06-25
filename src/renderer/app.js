// ── Default fields per tipo ──
const DEFAULTS = {
  movimientos: [
    ['Id', 'id', 'int64', true, true, true, true, true, true],
    ['IdEmpresa', 'idempresa', 'int64', true, true, true, true, false, true],
    ['IdUsuario', 'idusuario', 'int64', true, true, true, true, false, true],
    ['IdModulo', 'idmodulo', 'int64', true, true, true, true, false, true],
    ['IdDocumento', 'iddocumento', 'int64', true, true, true, true, true, true],
    ['Documento', 'documento', 'string', true, true, true, true, true, true],
    ['IdSerie', 'idserie', 'int64', true, true, true, true, true, true],
    ['Serie', 'serie', 'string', true, true, true, true, true, true],
    ['Numero', 'numero', 'int64', true, true, true, true, true, true],
    ['DocumentoSerie', 'documento_serie', 'DocumentoSerieResponse', true, true, false, true, false, false],
    ['IdEstado', 'idestado', 'int64', true, true, true, true, true, true],
    ['Estado', 'estado', 'string', true, true, true, true, true, true],
    ['CodigoEstado', 'codigo_estado', 'interface{}', true, true, true, true, false, true],
    ['FechaActualizado', 'fecha_actualizado', 'string', true, true, true, true, false, true],
    ['ValidacionFormulario', 'validacion_formulario', 'interface{}', true, true, true, true, false, true],
    ['Ventana', 'ventana', 'string', true, true, true, true, false, true],
    ['IdComponente', 'idcomponente', 'string', true, true, true, true, false, true],
    ['Habilitado', 'habilitado', 'bool', true, true, true, true, true, true],
    ['Field', 'field', 'string', true, true, true, true, false, true],
  ],
  mantenedores: [
    ['Id', 'id', 'int64', true, true, true, true, true, true],
    ['IdEmpresa', 'idempresa', 'int64', true, true, true, true, false, true],
    ['IdUsuario', 'idusuario', 'int64', true, true, true, true, false, true],
    ['IdModulo', 'idmodulo', 'int64', true, true, true, true, false, true],
    ['FechaActualizado', 'fecha_actualizado', 'string', true, true, true, true, false, true],
    ['ValidacionFormulario', 'validacion_formulario', 'interface{}', true, true, true, true, false, true],
    ['Ventana', 'ventana', 'string', true, true, true, true, false, true],
    ['IdComponente', 'idcomponente', 'string', true, true, true, true, false, true],
    ['Habilitado', 'habilitado', 'bool', true, true, true, true, true, true],
    ['Field', 'field', 'string', true, true, true, true, false, true],
    ['Codigo', 'codigo', 'string', true, true, true, true, true, true],
    ['Descripcion', 'descripcion', 'string', true, true, true, true, true, true],
  ],
};

const TYPES = ['string', 'int', 'int64', 'float64', 'float', 'bool', 'interface{}', 'time.Time', 'DocumentoSerieResponse'];
const TOGGLE_COLS = [
  { key: 'default', label: 'Def', tooltip: 'Campo por defecto', readOnly: true },
  { key: 'entity', label: 'Ent', tooltip: 'Incluir en Entity' },
  { key: 'request', label: 'Req', tooltip: 'Incluir en Request' },
  { key: 'response', label: 'Res', tooltip: 'Incluir en Response' },
  { key: 'listar', label: 'Lis', tooltip: 'Incluir en Listar' },
  { key: 'model', label: 'Mod', tooltip: 'Incluir en Model' },
];

const DET_TOGGLE_COLS = [
  ...TOGGLE_COLS,
  { key: 'padre', label: 'Pad', tooltip: 'Campo padre del detalle' },
];

// ── State ──
let camposData = [];  // { nombre, campo, tipo, default, entity, request, response, listar, model }
let importFieldsData = []; // { nombre, campo, tipo }
let detalleCards = []; // { nombre, tabla, valida, importar, campos: [...] }
let detalleCardId = 0;

// ── DOM refs ──
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const txtBase = $('#txtBase');
const txtRuta = $('#txtRuta');
const cmbDom = $('#cmbDom');
const txtServicio = $('#txtServicio');
const cmbTipo = $('#cmbTipo');
const txtTabla = $('#txtTabla');
const txtComponent = $('#txtComponent');
const chkBroker = $('#chkBroker');
const chkTieneDetalle = $('#chkTieneDetalle');
const chkImportHeader = $('#chkImportHeader');
const chkPorSP = $('#chkPorSP');
const suggestCodeEl = $('#suggestCode');
const suggestLabelEl = $('#suggestLabel');
const camposSection = $('#camposSection');
const camposTable = $('#camposTable');
const importSection = $('#importSection');
const importTable = $('#importTable');
const btnImportAdd = $('#btnImportAdd');
const btnImportRemove = $('#btnImportRemove');
const detalleSection = $('#detalleSection');
const detalleCardsEl = $('#detalleCards');
const btnGen = $('#btnGen');
const btnCamposRemove = $('#btnCamposRemove');
const resultModal = $('#resultModal');
const txtResult = $('#txtResult');

// ── Init ──
cmbTipo.addEventListener('change', () => populateDefaults(cmbTipo.value));
cmbDom.addEventListener('change', () => {
  if (!txtServicio.dataset.userChanged) {
    txtServicio.value = `${cmbDom.value}-service`;
  }
});
txtServicio.addEventListener('input', () => {
  txtServicio.dataset.userChanged = 'true';
});
populateDefaults('mantenedores');

function toPascalCase(s) {
  return (s || '')
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')
    .join('');
}
txtRuta.addEventListener('input', () => {
  txtComponent.value = toPascalCase(txtRuta.value);
});

// ── Populate defaults ──
function populateDefaults(tipo) {
  const defaults = DEFAULTS[tipo] || DEFAULTS.mantenedores;
  camposData = defaults.map(r => ({
    nombre: r[0], campo: r[1], tipo: r[2],
    default: r[3], entity: r[4], request: r[5],
    response: r[6], listar: r[7], model: r[8],
    import: false,
  }));
  renderCampos();
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Render import fields table ──
function renderImportFields() {
  let html = '<table><thead><tr>';
  html += '<th class="col-tiny"><input type="checkbox" id="selectAllImp" title="Seleccionar todo" /></th>';
  html += '<th class="col-mid">Nombre Campo</th>';
  html += '<th class="col-small">Tag BD</th>';
  html += '<th class="col-small">Tipo Go</th>';
  html += '</tr></thead><tbody>';

  importFieldsData.forEach((c, i) => {
    html += '<tr>';
    html += `<td><input type="checkbox" class="row-select-imp" data-idx="${i}" /></td>`;
    html += `<td><input type="text" value="${escHtml(c.nombre)}" data-idx="${i}" data-field="nombre" class="cell-input-imp" /></td>`;
    html += `<td><input type="text" value="${escHtml(c.campo)}" data-idx="${i}" data-field="campo" class="cell-input-imp" /></td>`;
    html += `<td><select data-idx="${i}" data-field="tipo" class="cell-select-imp">${TYPES.map(t => `<option value="${t}"${t === c.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  importTable.innerHTML = html;

  importTable.querySelectorAll('.cell-input-imp').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      importFieldsData[idx][field] = e.target.value;
    });
  });
  importTable.querySelectorAll('.cell-select-imp').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      importFieldsData[idx].tipo = e.target.value;
    });
  });

  const updateRemoveBtn = () => {
    const checked = importTable.querySelectorAll('.row-select-imp:checked');
    btnImportRemove.disabled = checked.length === 0;
  };

  importTable.querySelectorAll('.row-select-imp').forEach(el => {
    el.addEventListener('change', (e) => {
      e.target.closest('tr').classList.toggle('row-selected', e.target.checked);
      updateRemoveBtn();
    });
  });

  const selectAll = importTable.querySelector('#selectAllImp');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      importTable.querySelectorAll('.row-select-imp').forEach(el => {
        el.checked = e.target.checked;
        el.closest('tr').classList.toggle('row-selected', e.target.checked);
      });
      updateRemoveBtn();
    });
  }

  updateRemoveBtn();
}

// ── Render suggest combo selectors ──
function renderSuggestCombos() {
  const fields = camposData.filter(c => c.entity);
  const opts = fields.map(c => `<option value="${escHtml(c.nombre)}">${escHtml(c.nombre)} (${escHtml(c.campo)})</option>`).join('');

  const codeSel = suggestCodeEl;
  const currentCode = codeSel.value;
  codeSel.innerHTML = '<option value="">(ninguno)</option>' + opts;
  if (currentCode && fields.some(f => f.nombre === currentCode)) codeSel.value = currentCode;

  const labelSel = suggestLabelEl;
  const currentLabel = labelSel.value;
  labelSel.innerHTML = '<option value="">(ninguno)</option>' + opts;
  if (currentLabel && fields.some(f => f.nombre === currentLabel)) labelSel.value = currentLabel;
}

// ── Render campos table ──
function renderCampos() {
  renderCamposTable();
  renderSuggestCombos();
}

function renderCamposTable() {
  let html = '<table><thead><tr>';
  html += '<th class="col-tiny"><input type="checkbox" id="selectAll" title="Seleccionar todo" /></th>';
  html += '<th class="col-mid">Nombre Campo</th>';
  html += '<th class="col-small">Tag BD</th>';
  html += '<th class="col-small">Tipo Go</th>';
  for (const tc of TOGGLE_COLS) {
    html += `<th class="col-tiny" title="${tc.tooltip}">${tc.label}</th>`;
  }
  html += '</tr></thead><tbody>';

  camposData.forEach((c, i) => {
    html += '<tr>';
    html += `<td><input type="checkbox" class="row-select" data-idx="${i}" /></td>`;
    html += `<td><input type="text" value="${escHtml(c.nombre)}" data-idx="${i}" data-field="nombre" class="cell-input" /></td>`;
    html += `<td><input type="text" value="${escHtml(c.campo)}" data-idx="${i}" data-field="campo" class="cell-input" /></td>`;
    html += `<td><select data-idx="${i}" data-field="tipo" class="cell-select">${TYPES.map(t => `<option value="${t}"${t === c.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></td>`;
    for (const tc of TOGGLE_COLS) {
      let checked = c[tc.key] ? ' checked' : '';
      let ro = tc.readOnly ? ' disabled' : '';
      html += `<td><input type="checkbox" data-idx="${i}" data-field="${tc.key}"${checked}${ro} class="cell-chk" /></td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  camposTable.innerHTML = html;

  // Bind events
  camposTable.querySelectorAll('.cell-input').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      camposData[idx][field] = e.target.value;
    });
  });
  camposTable.querySelectorAll('.cell-select').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      camposData[idx].tipo = e.target.value;
    });
  });
  camposTable.querySelectorAll('.cell-chk').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      const isReadOnly = TOGGLE_COLS.find(tc => tc.key === field)?.readOnly;
      if (isReadOnly) return;
      camposData[idx][field] = e.target.checked;
    });
  });

  // Seleccion de filas
  const updateRemoveBtn = () => {
    const checked = camposTable.querySelectorAll('.row-select:checked');
    btnCamposRemove.disabled = checked.length === 0;
  };

  camposTable.querySelectorAll('.row-select').forEach(el => {
    el.addEventListener('change', (e) => {
      e.target.closest('tr').classList.toggle('row-selected', e.target.checked);
      updateRemoveBtn();
    });
  });

  // Select all
  const selectAll = camposTable.querySelector('#selectAll');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      camposTable.querySelectorAll('.row-select').forEach(el => {
        el.checked = e.target.checked;
        el.closest('tr').classList.toggle('row-selected', e.target.checked);
      });
      updateRemoveBtn();
    });
  }

  updateRemoveBtn();
}

// ── Import add/remove ──
btnImportAdd.addEventListener('click', () => {
  importFieldsData.push({ nombre: '', campo: '', tipo: 'string' });
  renderImportFields();
});

btnImportRemove.addEventListener('click', () => {
  const checked = [...importTable.querySelectorAll('.row-select-imp:checked')];
  const indexes = checked.map(el => parseInt(el.dataset.idx)).sort((a, b) => b - a);
  for (const idx of indexes) {
    importFieldsData.splice(idx, 1);
  }
  renderImportFields();
});

$('#btnImpTagsGen').addEventListener('click', () => {
  const tags = $('#txtImpTags').value.split(',').map(s => s.trim()).filter(Boolean);
  for (const t of tags) {
    const parts = t.split(/[:|]/);
    const tagName = parts[0].trim();
    const tagTipo = (parts[1] && parts[1].trim()) || 'string';
    const pascal = tagName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    if (!pascal) continue;
    importFieldsData.push({ nombre: pascal, campo: tagName, tipo: tagTipo });
  }
  renderImportFields();
  $('#txtImpTags').value = '';
});

// ── Main campos add/remove ──
const btnCamposAdd = $('#btnCamposAdd');
btnCamposAdd.addEventListener('click', () => {
  camposData.push({
    nombre: '', campo: '', tipo: 'string', default: false,
    entity: true, request: true, response: true,
    listar: true, model: true,
  });
  renderCampos();
});

$('#btnCamposRemove').addEventListener('click', () => {
  const checked = [...camposTable.querySelectorAll('.row-select:checked')];
  const indexes = checked.map(el => parseInt(el.dataset.idx)).sort((a, b) => b - a);
  for (const idx of indexes) {
    camposData.splice(idx, 1);
  }
  renderCampos();
});

// ── Bulk tag import ──
$('#btnTagsGen').addEventListener('click', () => {
  const tags = $('#txtTags').value.split(',').map(s => s.trim()).filter(Boolean);
  let added = 0;
  for (const t of tags) {
    const parts = t.split(/[:|]/);
    const tagName = parts[0].trim();
    const tagTipo = (parts[1] && parts[1].trim()) || 'string';
    const pascal = tagName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    if (!pascal) continue;
    camposData.push({
      nombre: pascal, campo: tagName, tipo: tagTipo, default: false,
      entity: true, request: true, response: true,
      listar: true, model: true,
    });
    added++;
  }
  renderCampos();
  $('#txtTags').value = '';
  alert(`${added} campos generados.`);
});

// ── Toggle import section ──
chkImportHeader.addEventListener('change', () => {
  importSection.style.display = chkImportHeader.checked ? 'block' : 'none';
  if (!chkImportHeader.checked) {
    importFieldsData = [];
    renderImportFields();
  }
});

// ── Toggle detalle section ──
chkTieneDetalle.addEventListener('change', () => {
  detalleSection.style.display = chkTieneDetalle.checked ? 'block' : 'none';
  if (!chkTieneDetalle.checked) {
    detalleCards = [];
    detalleCardsEl.innerHTML = '';
    detalleCardId = 0;
  }
});

// ── Detalle card ──
function createDetalleCard() {
  detalleCardId++;
  const id = detalleCardId;
  const card = document.createElement('div');
  card.className = 'detalle-card';
  card.dataset.id = id;

  const cardState = { nombre: '', tabla: '', valida: false, importar: false, campos: [{ nombre: 'Id', campo: 'id', tipo: 'int64', default: false, entity: true, request: true, response: true, listar: true, model: true, padre: false }], importFieldsData: [] };
  detalleCards.push(cardState);

  card.innerHTML = `
    <button class="card-close" data-id="${id}">×</button>
    <div class="card-row">
      <label>Nombre:</label>
      <input type="text" class="det-nombre" data-id="${id}" placeholder="ej: detalle-items" />
    </div>
    <div class="card-row">
      <label>Tabla:</label>
      <input type="text" class="det-tabla" data-id="${id}" placeholder="ej: TMDETALLE_ITEMS" />
    </div>
    <div class="card-row">
      <label class="chk-label"><input type="checkbox" class="det-valida" data-id="${id}" /> Requiere Validacion</label>
      <label class="chk-label"><input type="checkbox" class="det-import" data-id="${id}" /> Importar</label>
    </div>
    <div class="det-campos">
      <div class="det-campos-header">
        <span class="det-campos-title">Campos:</span>
        <div class="det-campos-toolbar">
          <button class="btn btn-sm btn-success det-campo-add" data-id="${id}">+ Campo</button>
          <button class="btn btn-sm btn-danger det-campo-remove" data-id="${id}">− Campo</button>
        </div>
        <div class="det-tags-group">
          <input type="text" class="input mono small det-tags-input" data-id="${id}" placeholder="tag1,tag2..." style="width:200px" />
          <button class="btn btn-sm btn-accent det-tags-gen" data-id="${id}">+Tags</button>
        </div>
      </div>
      <div class="det-campos-table" data-id="${id}"></div>
    </div>
    <div class="det-import-section" data-id="${id}" style="display:none">
      <div class="det-import-header">
        <span class="det-campos-title">Campos de Importacion (Excel)</span>
        <div class="det-campos-toolbar">
          <button class="btn btn-sm btn-success det-import-add" data-id="${id}">+ Agregar Campo</button>
          <button class="btn btn-sm btn-danger det-import-remove" data-id="${id}">− Quitar Seleccionados</button>
        </div>
        <div class="det-import-tags">
          <input type="text" class="input mono small det-imp-tags-input" data-id="${id}" placeholder="tag1:string,tag2:int64,..." style="width:200px" />
          <button class="btn btn-sm btn-accent det-imp-tags-gen" data-id="${id}">Generar</button>
        </div>
      </div>
      <div class="det-import-table table-container" data-id="${id}"></div>
    </div>
  `;

  detalleCardsEl.appendChild(card);
  renderDetCampos(id);
  bindDetalleEvents(id, cardState);
  return cardState;
}

function renderDetCampos(id) {
  const card = detalleCardsEl.querySelector(`.detalle-card[data-id="${id}"]`);
  if (!card) return;
  const container = card.querySelector('.det-campos-table');
  const cardIdx = detalleCards.findIndex((_, i) => {
    const c = detalleCardsEl.querySelectorAll('.detalle-card')[i];
    return c && parseInt(c.dataset.id) === id;
  });
  if (cardIdx < 0) return;
  const campos = detalleCards[cardIdx].campos;

  let html = '<table><thead><tr>';
  html += '<th>Nombre</th><th>Tag BD</th><th>Tipo</th>';
  for (const tc of DET_TOGGLE_COLS) {
    html += `<th class="col-tiny" title="${tc.tooltip}">${tc.label}</th>`;
  }
  html += '</tr></thead><tbody>';

  campos.forEach((c, i) => {
    html += '<tr>';
    html += `<td><input type="text" value="${escHtml(c.nombre || '')}" class="dc-input" data-id="${id}" data-idx="${i}" data-field="nombre" style="width:100%;border:none;background:transparent;color:var(--text);font-family:var(--mono);font-size:11px" /></td>`;
    html += `<td><input type="text" value="${escHtml(c.campo || '')}" class="dc-input" data-id="${id}" data-idx="${i}" data-field="campo" style="width:100%;border:none;background:transparent;color:var(--text);font-family:var(--mono);font-size:11px" /></td>`;
    html += `<td><select class="dc-select" data-id="${id}" data-idx="${i}" data-field="tipo" style="width:100%;border:none;background:transparent;color:var(--text);font-size:11px">${TYPES.map(t => `<option value="${t}"${t === c.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></td>`;
    for (const tc of DET_TOGGLE_COLS) {
      let checked = c[tc.key] ? ' checked' : '';
      let ro = tc.readOnly ? ' disabled' : '';
      html += `<td><input type="checkbox" class="dc-chk" data-id="${id}" data-idx="${i}" data-field="${tc.key}"${checked}${ro} style="display:block;margin:0 auto;accent-color:var(--accent)" /></td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  // Bind detail campo inputs
  container.querySelectorAll('.dc-input').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      detalleCards[cardIdx].campos[idx][e.target.dataset.field] = e.target.value;
    });
  });
  container.querySelectorAll('.dc-select').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      detalleCards[cardIdx].campos[idx].tipo = e.target.value;
    });
  });
  container.querySelectorAll('.dc-chk').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      const isReadOnly = TOGGLE_COLS.find(tc => tc.key === field)?.readOnly;
      if (isReadOnly) return;
      if (field === 'padre' && e.target.checked) {
        detalleCards[cardIdx].campos.forEach((c, i) => { if (i !== idx) c.padre = false; });
      }
      detalleCards[cardIdx].campos[idx][field] = e.target.checked;
      if (field === 'padre') renderDetCampos(id);
    });
  });
}

function getDetalleCardIdx(id) {
  for (let i = 0; i < detalleCardsEl.children.length; i++) {
    if (parseInt(detalleCardsEl.children[i].dataset.id) === id) return i;
  }
  return -1;
}

function renderDetImportFields(id) {
  const card = detalleCardsEl.querySelector(`.detalle-card[data-id="${id}"]`);
  if (!card) return;
  const container = card.querySelector('.det-import-table');
  const cardIdx = getDetalleCardIdx(id);
  if (cardIdx < 0) return;
  const fields = detalleCards[cardIdx].importFieldsData;

  let html = '<table><thead><tr>';
  html += '<th>Nombre</th><th>Tag BD</th><th>Tipo Go</th>';
  html += '</tr></thead><tbody>';

  fields.forEach((c, i) => {
    html += '<tr>';
    html += `<td><input type="text" value="${escHtml(c.nombre || '')}" class="dimp-input" data-id="${id}" data-idx="${i}" data-field="nombre" style="width:100%;border:none;background:transparent;color:var(--text);font-family:var(--mono);font-size:11px" /></td>`;
    html += `<td><input type="text" value="${escHtml(c.campo || '')}" class="dimp-input" data-id="${id}" data-idx="${i}" data-field="campo" style="width:100%;border:none;background:transparent;color:var(--text);font-family:var(--mono);font-size:11px" /></td>`;
    html += `<td><select class="dimp-select" data-id="${id}" data-idx="${i}" data-field="tipo" style="width:100%;border:none;background:transparent;color:var(--text);font-size:11px">${TYPES.map(t => `<option value="${t}"${t === c.tipo ? ' selected' : ''}>${t}</option>`).join('')}</select></td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  container.querySelectorAll('.dimp-input').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      detalleCards[cardIdx].importFieldsData[idx][e.target.dataset.field] = e.target.value;
    });
  });
  container.querySelectorAll('.dimp-select').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      detalleCards[cardIdx].importFieldsData[idx].tipo = e.target.value;
    });
  });
}

function bindDetalleEvents(id, cardState) {
  const card = detalleCardsEl.querySelector(`.detalle-card[data-id="${id}"]`);
  const cardIdx = () => {
    for (let i = 0; i < detalleCardsEl.children.length; i++) {
      if (parseInt(detalleCardsEl.children[i].dataset.id) === id) return i;
    }
    return -1;
  };

  // Close
  card.querySelector('.card-close').addEventListener('click', () => {
    card.remove();
    const idx = cardIdx();
    if (idx >= 0) detalleCards.splice(idx, 1);
  });

  // Nombre
  card.querySelector('.det-nombre').addEventListener('change', (e) => {
    const idx = cardIdx();
    if (idx >= 0) detalleCards[idx].nombre = e.target.value;
  });

  // Tabla
  card.querySelector('.det-tabla').addEventListener('change', (e) => {
    const idx = cardIdx();
    if (idx >= 0) detalleCards[idx].tabla = e.target.value;
  });

  // Valida
  card.querySelector('.det-valida').addEventListener('change', (e) => {
    const idx = cardIdx();
    if (idx >= 0) detalleCards[idx].valida = e.target.checked;
  });

  // Import
  card.querySelector('.det-import').addEventListener('change', (e) => {
    const idx = cardIdx();
    if (idx >= 0) {
      detalleCards[idx].importar = e.target.checked;
      const section = card.querySelector('.det-import-section');
      section.style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) {
        detalleCards[idx].importFieldsData = [];
      }
      renderDetImportFields(id);
    }
  });

  // Add campo
  card.querySelector('.det-campo-add').addEventListener('click', () => {
    const idx = cardIdx();
    if (idx >= 0) {
      detalleCards[idx].campos.push({
        nombre: '', campo: '', tipo: 'string', default: false,
        entity: true, request: true, response: true,
        listar: true, model: true, padre: false,
      });
      renderDetCampos(id);
    }
  });

  // Remove campo
  card.querySelector('.det-campo-remove').addEventListener('click', () => {
    const idx = cardIdx();
    if (idx >= 0) {
      detalleCards[idx].campos.pop();
      renderDetCampos(id);
    }
  });

  // Tags gen
  card.querySelector('.det-tags-gen').addEventListener('click', () => {
    const input = card.querySelector('.det-tags-input');
    const tags = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const idx = cardIdx();
    if (idx < 0) return;
    for (const t of tags) {
      const parts = t.split(/[:|]/);
      const tagName = parts[0].trim();
      const tagTipo = (parts[1] && parts[1].trim()) || 'string';
      const pascal = tagName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      if (!pascal) continue;
      detalleCards[idx].campos.push({
        nombre: pascal, campo: tagName, tipo: tagTipo, default: false,
        entity: true, request: true, response: true,
        listar: true, model: true, padre: false,
      });
    }
    renderDetCampos(id);
    input.value = '';
  });

  // Add import campo
  card.querySelector('.det-import-add').addEventListener('click', () => {
    const idx = cardIdx();
    if (idx >= 0) {
      detalleCards[idx].importFieldsData.push({ nombre: '', campo: '', tipo: 'string' });
      renderDetImportFields(id);
    }
  });

  // Remove import campo
  card.querySelector('.det-import-remove').addEventListener('click', () => {
    const idx = cardIdx();
    if (idx >= 0) {
      detalleCards[idx].importFieldsData.pop();
      renderDetImportFields(id);
    }
  });

  // Import tags gen
  card.querySelector('.det-imp-tags-gen').addEventListener('click', () => {
    const input = card.querySelector('.det-imp-tags-input');
    const tags = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const idx = cardIdx();
    if (idx < 0) return;
    for (const t of tags) {
      const parts = t.split(/[:|]/);
      const tagName = parts[0].trim();
      const tagTipo = (parts[1] && parts[1].trim()) || 'string';
      const pascal = tagName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      if (!pascal) continue;
      detalleCards[idx].importFieldsData.push({ nombre: pascal, campo: tagName, tipo: tagTipo });
    }
    renderDetImportFields(id);
    input.value = '';
  });
}

$('#detalleBtnAdd').addEventListener('click', createDetalleCard);
$('#detalleBtnRemove').addEventListener('click', () => {
  if (detalleCardsEl.lastChild) {
    const id = parseInt(detalleCardsEl.lastChild.dataset.id);
    detalleCards.pop();
    detalleCardsEl.lastChild.remove();
  }
});

// ── Browse folder ──
$('#btnBrowse').addEventListener('click', async () => {
  const folder = await window.electronAPI.selectFolder();
  if (folder) txtBase.value = folder;
});

// ── Generate module ──
btnGen.addEventListener('click', async () => {
  const campos = camposData.map(c => ({
    nombre: c.nombre, campo: c.campo, tipo: c.tipo,
    entity: c.entity, request: c.request, response: c.response,
    listar: c.listar, model: c.model,
  }));

  const detalles = detalleCards.map(d => ({
    nombre: d.nombre, tabla: d.tabla, valida: d.valida, importar: d.importar,
    campos: d.campos,
    importFields: d.importFieldsData,
  }));

  const config = {
    ruta: txtRuta.value.trim(),
    dominio: cmbDom.value,
    servicio: txtServicio.value.trim() || `${cmbDom.value}-service`,
    tipo: cmbTipo.value,
    tabla: txtTabla.value.trim(),
    componente: txtComponent.value.trim(),
    broker: chkBroker.checked,
    importHeader: chkImportHeader.checked,
    porSP: chkPorSP.checked,
    suggestCode: suggestCodeEl.value,
    suggestLabel: suggestLabelEl.value,
    basePath: txtBase.value.trim(),
    campos,
    importFields: importFieldsData,
    detalles,
  };

  if (!config.ruta || !config.tabla) {
    alert('Debe completar los campos Modulo y Tabla BD');
    return;
  }

  btnGen.disabled = true;
  btnGen.textContent = '⏳ Generando...';

  resultModal.style.display = 'flex';
  txtResult.value = '';

  const result = await window.electronAPI.generateModule(config);

  if (result.success) {
    txtResult.value = result.logs.join('\n');
  } else {
    txtResult.value = `[ERROR] ${result.error || result.logs.join('\n')}`;
  }

  btnGen.disabled = false;
  btnGen.textContent = '⚡ Generar Modulo';
});

$('#btnCloseResult').addEventListener('click', () => {
  resultModal.style.display = 'none';
});

// Close modal on outer click
resultModal.addEventListener('click', (e) => {
  if (e.target === resultModal) resultModal.style.display = 'none';
});

// Enable/disable generate button based on form validity
function checkForm() {
  btnGen.disabled = !txtRuta.value.trim() || !txtTabla.value.trim();
}
txtRuta.addEventListener('input', checkForm);
txtTabla.addEventListener('input', checkForm);
checkForm();

// ── Init first detalle card if needed (on check change after render) ──
